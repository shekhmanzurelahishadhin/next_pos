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

class StockTransferService
{
    // Barcode autocomplete: barcodes of the company that still have stock to move
    public function searchBarcodes(string $term, ?int $companyId, ?int $exceptTransferId = null): array
    {
        return InventoryBarcode::with('product:id,name,part_number', 'store:id,name', 'location:id,name')
            ->where('barcode', 'like', "%{$term}%")
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->whereRaw('stock_in - stock_out > 0')
            ->orderBy('barcode')
            ->limit(10)
            ->get()
            ->map(fn($row) => [
                'barcode'       => $row->barcode,
                'product_id'    => $row->product_id,
                'product_name'  => $row->product?->name,
                'part_number'   => $row->product?->part_number,
                'store_id'      => $row->store_id,
                'store_name'    => $row->store?->name,
                'location_id'   => $row->location_id,
                'location_name' => $row->location?->name,
                'stock'         => $this->availableStock($row->barcode, $exceptTransferId),
            ])
            ->filter(fn($row) => $row['stock'] > 0)
            ->values()
            ->all();
    }

    // "Save": a pending transfer, stock moves only on approve
    public function createTransfer(array $data): StockTransfer
    {
        $this->checkItems($data);

        $duplicate = StockTransfer::where('company_id', $data['company_id'])
            ->whereDate('transfer_date', $data['transfer_date'])
            ->where('created_by', Auth::id())
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        return DB::transaction(function () use ($data) {
            $maxSlNo = (int) StockTransfer::lockForUpdate()->max('max_sl_no') + 1;
            // parts_bazar transfer no: 5 digit serial + mmyy
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
            return $transfer;
        });
    }

    // Edit a pending transfer: the grid replaces the old lines
    public function updateTransfer(StockTransfer $transfer, array $data): StockTransfer
    {
        $this->mustBePending($transfer);
        $this->checkItems($data, $transfer->id);

        return DB::transaction(function () use ($transfer, $data) {
            $transfer->update([
                'transfer_date' => $data['transfer_date'],
                'company_id'    => $data['company_id'],
                'remarks'       => $data['remarks'] ?? null,
                'updated_by'    => Auth::id(),
            ]);
            $transfer->details()->delete();
            $this->saveDetails($transfer, $data['items']);
            return $transfer;
        });
    }

    // Approve: stock out of the old barcode, stock in under a new barcode at the new place
    public function approveTransfer(StockTransfer $transfer): void
    {
        $this->mustBePending($transfer);

        DB::transaction(function () use ($transfer) {
            $transfer->load('details');
            $date = $transfer->transfer_date;

            foreach ($transfer->details as $item) {
                $old = InventoryBarcode::where('barcode', $item->barcode)->first();
                if (!$old || $item->transfer_qty > InventoryBarcode::closingStock($item->barcode)) {
                    throw new \RuntimeException("Transfer Qty is greater than stock qty! (barcode {$item->barcode})");
                }

                $common = [
                    'company_id'       => $transfer->company_id,
                    'product_id'       => $item->product_id,
                    'purchase_price'   => $old->purchase_price,
                    'sell_price'       => $old->sell_price,
                    'transaction_date' => $date,
                    'entry_point'      => StockTransfer::ENTRY_POINT,
                    'entry_no'         => $transfer->transfer_no,
                    'reference_id'     => $item->id,
                ];

                // STOCK OUT
                Inventory::create($common + [
                    'store_id'    => $item->from_store_id,
                    'location_id' => $item->from_location_id,
                    'stock_out'   => $item->transfer_qty,
                    'barcode'     => $item->barcode,
                    'created_by'  => Auth::id(),
                ]);
                InventoryBarcode::addStockOut($item->barcode, (float) $item->transfer_qty);

                // STOCK IN
                $stockIn = $common + [
                    'store_id'    => $item->to_store_id,
                    'location_id' => $item->to_location_id,
                    'stock_in'    => $item->transfer_qty,
                    'barcode'     => InventoryBarcode::newBarcode(),
                ];
                Inventory::create($stockIn + ['created_by' => Auth::id()]);
                InventoryBarcode::create($stockIn);

                $item->update(['new_barcode' => $stockIn['barcode']]);
            }

            $transfer->update([
                'status'      => StockTransfer::APPROVED,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);
        });
    }

    // Manage Stock Transfer: one row per transfer
    public function getRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('stock_transfers as t')
            ->leftJoin('users as cu', 'cu.id', '=', 't.created_by')
            ->leftJoin('users as au', 'au.id', '=', 't.approved_by')
            ->select(
                't.id', 't.max_sl_no', 't.transfer_no', 't.transfer_date', 't.status', 't.remarks',
                't.created_at', 't.approved_at', 'cu.name as created_by_name', 'au.name as approved_by_name',
                DB::raw('(SELECT COUNT(*) FROM stock_transfer_details d WHERE d.stock_transfer_id = t.id) as items'),
                DB::raw('(SELECT COALESCE(SUM(transfer_qty), 0) FROM stock_transfer_details d WHERE d.stock_transfer_id = t.id) as total_qty')
            );

        $this->onlyOwnCompany($query, 't');

        $query
            ->when($filters['transfer_no'] ?? null, fn($q, $v) => $q->where('t.transfer_no', 'like', "%{$v}%"))
            ->when($filters['transfer_date'] ?? null, fn($q, $v) => $q->where('t.transfer_date', 'like', "%{$v}%"))
            ->when($filters['created_by_name'] ?? null, fn($q, $v) => $q->where('cu.name', 'like', "%{$v}%"))
            ->when($filters['approved_by_name'] ?? null, fn($q, $v) => $q->where('au.name', 'like', "%{$v}%"))
            ->when(isset($filters['status']) && $filters['status'] !== '', fn($q) => $q->where('t.status', $filters['status']));

        return $query->orderByDesc('t.id')->paginate($perPage ?: 10);
    }

    public function getTransfer(int $id): StockTransfer
    {
        $query = StockTransfer::with([
            'details.product:id,name,part_number',
            'details.fromStore:id,name', 'details.fromLocation:id,name',
            'details.toStore:id,name', 'details.toLocation:id,name',
            'company:id,name,address,phone,email',
            'createdBy:id,name', 'approvedBy:id,name',
        ]);
        $this->onlyOwnCompany($query, 'stock_transfers');
        return $query->findOrFail($id);
    }

    // parts_bazar deletes a pending transfer only
    public function deleteTransfer(StockTransfer $transfer): void
    {
        $this->mustBePending($transfer);
        $transfer->delete(); // details go with it (cascade)
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
        $barcodes = array_column($data['items'], 'barcode');
        if (count($barcodes) !== count(array_unique($barcodes))) {
            throw new \RuntimeException('Sorry! This Barcode is already added.');
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
            if (!Location::where('id', $item['to_location_id'])->where('store_id', $item['to_store_id'])->exists()) {
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
            ->whereHas('sale', fn($q) => $q->where('status', Sale::PENDING))
            ->sum('qty');
        $pendingTransfers = StockTransferDetail::where('barcode', $barcode)
            ->whereHas('stockTransfer', fn($q) => $q->where('status', StockTransfer::PENDING)
                ->when($exceptTransferId, fn($w) => $w->where('id', '!=', $exceptTransferId)))
            ->sum('transfer_qty');

        return InventoryBarcode::closingStock($barcode) - (float) $pendingSales - (float) $pendingTransfers;
    }

    private function mustBePending(StockTransfer $transfer): void
    {
        if ($transfer->status != StockTransfer::PENDING) {
            throw new \RuntimeException('Already Approved can not update!');
        }
    }

    private function onlyOwnCompany($query, string $alias): void
    {
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where("{$alias}.company_id", Auth::user()->company_id);
        }
    }
}
