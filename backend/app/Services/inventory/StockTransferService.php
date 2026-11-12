<?php

namespace App\Services\inventory;

use App\Models\inventory\Inventory;
use App\Models\inventory\InventoryBarcode;
use App\Models\inventory\StockTransfer;
use App\Models\inventory\StockTransferDetail;
use App\Models\sales\Sale;
use App\Models\sales\SaleDetail;
use App\Models\softConfig\Location;
use App\Models\softConfig\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Stock transfer, like parts_bazar: save (pending) -> approve (the stock moves) -> locked
class StockTransferService
{
    // Barcode autocomplete: barcodes of the company that still have stock to move
    public function searchBarcodes(string $term, ?int $companyId, ?int $exceptTransferId = null): array
    {
        $query = InventoryBarcode::with('product:id,name,part_number', 'store:id,name', 'location:id,name')
            ->where('barcode', 'like', '%' . $term . '%')
            ->whereRaw('stock_in - stock_out > 0');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $barcodes = $query->orderBy('barcode')->limit(10)->get();

        $result = [];
        foreach ($barcodes as $row) {
            // the stock pending sales and transfers already hold can not be moved
            $stock = $this->availableStock($row->barcode, $exceptTransferId);
            if ($stock <= 0) {
                continue;
            }

            $result[] = [
                'barcode'       => $row->barcode,
                'product_id'    => $row->product_id,
                'product_name'  => $row->product ? $row->product->name : null,
                'part_number'   => $row->product ? $row->product->part_number : null,
                'store_id'      => $row->store_id,
                'store_name'    => $row->store ? $row->store->name : null,
                'location_id'   => $row->location_id,
                'location_name' => $row->location ? $row->location->name : null,
                'stock'         => $stock,
            ];
        }

        return $result;
    }

    // "Save": a pending transfer, the stock moves only on approve
    public function createTransfer(array $data): StockTransfer
    {
        $this->checkItems($data);

        // same company and date saved by the same user in the last 30 seconds = double click
        $duplicate = StockTransfer::where('company_id', $data['company_id'])
            ->whereDate('transfer_date', $data['transfer_date'])
            ->where('created_by', Auth::id())
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        DB::beginTransaction();
        try {
            // lock the table, so two users never get the same number
            $maxSlNo = (int) StockTransfer::lockForUpdate()->max('max_sl_no') + 1;

            // parts_bazar transfer no: 5 digit serial + mmyy, like 000030126
            $transferNo = str_pad((string) $maxSlNo, 5, '0', STR_PAD_LEFT) . date('my', strtotime($data['transfer_date']));

            $transfer = StockTransfer::create([
                'max_sl_no'     => $maxSlNo,
                'transfer_no'   => $transferNo,
                'transfer_date' => $data['transfer_date'],
                'company_id'    => $data['company_id'],
                'remarks'       => $data['remarks'] ?? null,
                'status'        => StockTransfer::PENDING,
                'created_by'    => Auth::id(),
            ]);
            $this->saveDetails($transfer, $data['items']);

            DB::commit();
            return $transfer;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Edit a pending transfer: the grid replaces the old lines
    public function updateTransfer(StockTransfer $transfer, array $data): StockTransfer
    {
        $this->mustBePending($transfer);
        $this->checkItems($data, $transfer->id);

        DB::beginTransaction();
        try {
            $transfer->update([
                'transfer_date' => $data['transfer_date'],
                'company_id'    => $data['company_id'],
                'remarks'       => $data['remarks'] ?? null,
                'updated_by'    => Auth::id(),
            ]);
            $transfer->details()->delete();
            $this->saveDetails($transfer, $data['items']);

            DB::commit();
            return $transfer;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Approve: stock out of the old barcode, stock in under a new barcode at the new place
    public function approveTransfer(StockTransfer $transfer): void
    {
        $this->mustBePending($transfer);

        DB::beginTransaction();
        try {
            $transfer->load('details');

            foreach ($transfer->details as $item) {
                $this->moveItem($transfer, $item);
            }

            $transfer->update([
                'status'      => StockTransfer::APPROVED,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // one line of an approved transfer: stock out at the old place, stock in at the new place
    private function moveItem(StockTransfer $transfer, StockTransferDetail $item): void
    {
        $oldBarcode = InventoryBarcode::where('barcode', $item->barcode)->first();
        if (!$oldBarcode || $item->transfer_qty > InventoryBarcode::closingStock($item->barcode)) {
            throw new \RuntimeException("Transfer Qty is greater than stock qty! (barcode {$item->barcode})");
        }

        // stock out of the old barcode
        Inventory::create([
            'company_id'       => $transfer->company_id,
            'product_id'       => $item->product_id,
            'purchase_price'   => $oldBarcode->purchase_price,
            'sell_price'       => $oldBarcode->sell_price,
            'transaction_date' => $transfer->transfer_date,
            'entry_point'      => StockTransfer::ENTRY_POINT,
            'entry_no'         => $transfer->transfer_no,
            'reference_id'     => $item->id,
            'store_id'         => $item->from_store_id,
            'location_id'      => $item->from_location_id,
            'stock_out'        => $item->transfer_qty,
            'barcode'          => $item->barcode,
            'created_by'       => Auth::id(),
        ]);
        InventoryBarcode::addStockOut($item->barcode, (float) $item->transfer_qty);

        // stock in under a new barcode at the new store / location
        $stockIn = [
            'company_id'       => $transfer->company_id,
            'product_id'       => $item->product_id,
            'purchase_price'   => $oldBarcode->purchase_price,
            'sell_price'       => $oldBarcode->sell_price,
            'transaction_date' => $transfer->transfer_date,
            'entry_point'      => StockTransfer::ENTRY_POINT,
            'entry_no'         => $transfer->transfer_no,
            'reference_id'     => $item->id,
            'store_id'         => $item->to_store_id,
            'location_id'      => $item->to_location_id,
            'stock_in'         => $item->transfer_qty,
            'barcode'          => InventoryBarcode::newBarcode(),
        ];
        InventoryBarcode::create($stockIn);

        $stockIn['created_by'] = Auth::id();
        Inventory::create($stockIn);

        $item->update(['new_barcode' => $stockIn['barcode']]);
    }

    // Manage Stock Transfer: one row per transfer
    public function getRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('stock_transfers')
            ->leftJoin('users as created_user', 'created_user.id', '=', 'stock_transfers.created_by')
            ->leftJoin('users as approved_user', 'approved_user.id', '=', 'stock_transfers.approved_by')
            ->select(
                'stock_transfers.id',
                'stock_transfers.max_sl_no',
                'stock_transfers.transfer_no',
                'stock_transfers.transfer_date',
                'stock_transfers.status',
                'stock_transfers.remarks',
                'stock_transfers.created_at',
                'stock_transfers.approved_at',
                'created_user.name as created_by_name',
                'approved_user.name as approved_by_name'
            )
            // how many lines and how much qty each transfer has
            ->selectRaw('(SELECT COUNT(*) FROM stock_transfer_details d WHERE d.stock_transfer_id = stock_transfers.id) as items')
            ->selectRaw('(SELECT COALESCE(SUM(transfer_qty), 0) FROM stock_transfer_details d WHERE d.stock_transfer_id = stock_transfers.id) as total_qty');

        $this->onlyOwnCompany($query);

        if (!empty($filters['transfer_no'])) {
            $query->where('stock_transfers.transfer_no', 'like', '%' . $filters['transfer_no'] . '%');
        }
        if (!empty($filters['transfer_date'])) {
            $query->where('stock_transfers.transfer_date', 'like', '%' . $filters['transfer_date'] . '%');
        }
        if (!empty($filters['created_by_name'])) {
            $query->where('created_user.name', 'like', '%' . $filters['created_by_name'] . '%');
        }
        if (!empty($filters['approved_by_name'])) {
            $query->where('approved_user.name', 'like', '%' . $filters['approved_by_name'] . '%');
        }
        // status 0 (Pending) is a real value, so only an empty status means "all"
        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('stock_transfers.status', $filters['status']);
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('stock_transfers.id')->paginate($perPage);
    }

    public function getTransfer(int $id): StockTransfer
    {
        $query = StockTransfer::with([
            'details.product:id,name,part_number',
            'details.fromStore:id,name',
            'details.fromLocation:id,name',
            'details.toStore:id,name',
            'details.toLocation:id,name',
            'company:id,name,address,phone,email',
            'createdBy:id,name',
            'approvedBy:id,name',
        ]);
        $this->onlyOwnCompany($query);

        return $query->findOrFail($id);
    }

    // parts_bazar deletes a pending transfer only
    public function deleteTransfer(StockTransfer $transfer): void
    {
        $this->mustBePending($transfer);
        $transfer->delete(); // the details go with it (cascade)
    }

    private function saveDetails(StockTransfer $transfer, array $items): void
    {
        foreach ($items as $item) {
            $barcode = InventoryBarcode::where('barcode', $item['barcode'])->first();

            StockTransferDetail::create([
                'stock_transfer_id' => $transfer->id,
                'product_id'        => $barcode->product_id,
                'barcode'           => $barcode->barcode,
                'from_store_id'     => $barcode->store_id,
                'from_location_id'  => $barcode->location_id,
                'stock_qty'         => InventoryBarcode::closingStock($barcode->barcode),
                'to_store_id'       => $item['to_store_id'],
                'to_location_id'    => $item['to_location_id'],
                'transfer_qty'      => $item['transfer_qty'],
            ]);
        }
    }

    // parts_bazar add() / qtyValidation checks, done again on the server
    private function checkItems(array $data, ?int $transferId = null): void
    {
        // one barcode only once in the grid
        $seen = [];
        foreach ($data['items'] as $item) {
            if (in_array($item['barcode'], $seen)) {
                throw new \RuntimeException('Sorry! This Barcode is already added.');
            }
            $seen[] = $item['barcode'];
        }

        foreach ($data['items'] as $item) {
            $barcode = InventoryBarcode::where('barcode', $item['barcode'])->first();
            if (!$barcode || ($barcode->company_id && $barcode->company_id != $data['company_id'])) {
                throw new \RuntimeException("Barcode {$item['barcode']} not found for this company.");
            }

            $toStore = Store::find($item['to_store_id']);
            if ($toStore->company_id && $toStore->company_id != $data['company_id']) {
                throw new \RuntimeException("{$toStore->name} is not a store of this company.");
            }

            $locationInStore = Location::where('id', $item['to_location_id'])->where('store_id', $item['to_store_id'])->exists();
            if (!$locationInStore) {
                throw new \RuntimeException("Location is not in {$toStore->name}.");
            }

            if ($barcode->store_id == $item['to_store_id'] && $barcode->location_id == $item['to_location_id']) {
                throw new \RuntimeException('Location Should Be Different');
            }

            if ($item['transfer_qty'] > $this->availableStock($barcode->barcode, $transferId)) {
                throw new \RuntimeException("Transfer Quantity cannot be greater than Stock Quantity (barcode {$barcode->barcode}).");
            }
        }
    }

    // Barcode stock less what pending sales and other pending transfers already hold
    private function availableStock(string $barcode, ?int $exceptTransferId = null): float
    {
        $pendingSales = SaleDetail::where('barcode', $barcode)
            ->whereHas('sale', function ($sale) {
                $sale->where('status', Sale::PENDING);
            })
            ->sum('qty');

        // the transfer being edited does not count
        $pendingTransfers = StockTransferDetail::where('barcode', $barcode)
            ->whereHas('stockTransfer', function ($transfer) use ($exceptTransferId) {
                $transfer->where('status', StockTransfer::PENDING);
                if ($exceptTransferId) {
                    $transfer->where('id', '!=', $exceptTransferId);
                }
            })
            ->sum('transfer_qty');

        return InventoryBarcode::closingStock($barcode) - (float) $pendingSales - (float) $pendingTransfers;
    }

    private function mustBePending(StockTransfer $transfer): void
    {
        if ($transfer->status != StockTransfer::PENDING) {
            throw new \RuntimeException('Already Approved can not update!');
        }
    }

    // a company user can only see the transfers of own company
    private function onlyOwnCompany($query): void
    {
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            $query->where('stock_transfers.company_id', $user->company_id);
        }
    }
}
