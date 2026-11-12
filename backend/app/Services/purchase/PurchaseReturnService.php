<?php

namespace App\Services\purchase;

use App\Models\inventory\Inventory;
use App\Models\inventory\InventoryBarcode;
use App\Models\purchase\Purchase;
use App\Models\purchase\PurchaseReturn;
use App\Models\purchase\PurchaseReturnDetail;
use App\Services\softConfig\ScrollCodeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Purchase return, same flow as parts_bazar receivedPurchase/return:
// pick an approved PO, enter return qty per item -> stock out, the return amount lowers the supplier due
// (when the supplier gives the money back it is a refund and the due does not change)
class PurchaseReturnService
{
    const ENTRY_POINT = 'purchase_return';

    public function __construct(private ScrollCodeService $scrollCodes)
    {
    }

    // "Purchase Return" page: items of approved POs, one row per item
    public function getReturnableRows(array $filters = [], $perPage = 10)
    {
        // qty already returned of each purchased item
        $returnedByItem = DB::table('purchase_return_details')
            ->whereNull('deleted_at')
            ->select('purchase_detail_id')
            ->selectRaw('SUM(return_qty) as returned_qty')
            ->groupBy('purchase_detail_id');

        $query = DB::table('purchase_details')
            ->join('purchases', 'purchases.id', '=', 'purchase_details.purchase_id')
            ->join('products', 'products.id', '=', 'purchase_details.product_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->leftJoin('stores', 'stores.id', '=', 'purchases.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'purchase_details.location_id')
            ->leftJoinSub($returnedByItem, 'returned', 'returned.purchase_detail_id', '=', 'purchase_details.id')
            ->whereNull('purchase_details.deleted_at')
            ->whereNull('purchases.deleted_at')
            ->where('purchases.status', Purchase::APPROVED)
            ->select(
                'purchase_details.id',
                'purchase_details.purchase_id',
                'purchase_details.qty',
                'purchase_details.unit',
                'purchases.po_no',
                'purchases.purchase_date',
                'purchases.supplier_bill_no',
                'products.name as product_name',
                'products.part_number',
                'suppliers.name as supplier_name',
                'stores.name as store_name',
                'locations.name as location_name'
            )
            ->selectRaw('COALESCE(returned.returned_qty, 0) as returned_qty');

        // a company user can only see the purchases of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('purchases.company_id', $ownCompanyId);
        }

        if (!empty($filters['po_no'])) {
            $query->where('purchases.po_no', 'like', '%' . $filters['po_no'] . '%');
        }
        if (!empty($filters['supplier_name'])) {
            $query->where('suppliers.name', 'like', '%' . $filters['supplier_name'] . '%');
        }
        if (!empty($filters['store_id'])) {
            $query->where('purchases.store_id', $filters['store_id']);
        }
        if (!empty($filters['location_name'])) {
            $query->where('locations.name', 'like', '%' . $filters['location_name'] . '%');
        }
        if (!empty($filters['product_name'])) {
            $query->where('products.name', 'like', '%' . $filters['product_name'] . '%');
        }
        if (!empty($filters['part_number'])) {
            $query->where('products.part_number', 'like', '%' . $filters['part_number'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('purchases.id')->orderBy('purchase_details.id')->paginate($perPage);
    }

    // Return form of one PO: every item with received, already returned and in stock qty
    public function returnForm(Purchase $purchase): array
    {
        $this->mustBeApproved($purchase);
        $purchase->load('details.product:id,name,part_number', 'details.location:id,name', 'supplier:id,name', 'store:id,name');

        $items = [];
        foreach ($purchase->details as $detail) {
            $barcode = $this->barcodeOf($purchase, $detail->id);

            $items[] = [
                'purchase_detail_id' => $detail->id,
                'product_name'       => $detail->product ? $detail->product->name : null,
                'part_number'        => $detail->product ? $detail->product->part_number : null,
                'location_name'      => $detail->location ? $detail->location->name : null,
                'barcode'            => $barcode,
                'received_qty'       => (float) $detail->qty,
                'returned_qty'       => $this->returnedQty($detail->id),
                'closing_stock'      => InventoryBarcode::closingStock($barcode),
                'unit_price'         => $this->unitCost($detail),
            ];
        }

        return [
            'purchase_id'   => $purchase->id,
            'po_no'         => $purchase->po_no,
            'purchase_date' => $purchase->purchase_date->toDateString(),
            'supplier_id'   => $purchase->supplier_id,
            'supplier_name' => $purchase->supplier ? $purchase->supplier->name : null,
            'store_name'    => $purchase->store ? $purchase->store->name : null,
            'items'         => $items,
        ];
    }

    public function createReturn(Purchase $purchase, array $data): PurchaseReturn
    {
        $this->mustBeApproved($purchase);

        if ($data['return_date'] < $purchase->purchase_date->toDateString()) {
            throw new \RuntimeException('Return date can not be before the purchase date.');
        }

        // same PO and date saved in the last 30 seconds = double click
        $duplicate = PurchaseReturn::where('purchase_id', $purchase->id)
            ->whereDate('return_date', $data['return_date'])
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        // only the items with a return qty
        $lines = [];
        foreach ($data['items'] as $item) {
            if ($item['return_qty'] > 0) {
                $lines[] = $item;
            }
        }
        if (count($lines) == 0) {
            throw new \RuntimeException('Please enter return qty!');
        }

        DB::beginTransaction();
        try {
            $purchase->load('details');
            $isRefund = !empty($data['is_refund']);

            $return = PurchaseReturn::create([
                'return_no'   => $this->scrollCodes->nextNumber('purchase_return', $data['return_date']),
                'max_sl_no'   => (int) PurchaseReturn::withTrashed()->max('max_sl_no') + 1,
                'purchase_id' => $purchase->id,
                'company_id'  => $purchase->company_id,
                'store_id'    => $purchase->store_id,
                'supplier_id' => $purchase->supplier_id,
                'return_date' => $data['return_date'],
                'is_refund'   => $isRefund ? 1 : 0,
                'remarks'     => $data['remarks'] ?? null,
                'created_by'  => Auth::id(),
            ]);

            $total = 0;
            foreach ($lines as $line) {
                $detail = $purchase->details->firstWhere('id', $line['purchase_detail_id']);
                if (!$detail) {
                    throw new \RuntimeException('Item is not in this purchase.');
                }

                $total += $this->returnItem($purchase, $return, $detail, (float) $line['return_qty'], $data['return_date']);
            }

            $refundAmount = 0;
            if ($isRefund) {
                $refundAmount = $total;
            }
            $return->update([
                'total_amount'  => $total,
                'refund_amount' => $refundAmount,
            ]);

            DB::commit();
            return $return;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // one returned item: save the line and take the qty out of stock; returns the line total
    private function returnItem(Purchase $purchase, PurchaseReturn $return, $detail, float $qty, string $returnDate): float
    {
        $barcode = $this->barcodeOf($purchase, $detail->id);

        // can not return more than is left of the item, or more than is in stock
        $remaining = (float) $detail->qty - $this->returnedQty($detail->id);
        if ($qty > $remaining || $qty > InventoryBarcode::closingStock($barcode)) {
            throw new \RuntimeException('Return Qty cannot be greater than Closing Stock or Remaining Qty.');
        }

        $unitPrice = $this->unitCost($detail);
        $lineTotal = round($unitPrice * $qty, 2);

        $returnDetail = PurchaseReturnDetail::create([
            'purchase_return_id' => $return->id,
            'purchase_detail_id' => $detail->id,
            'product_id'         => $detail->product_id,
            'location_id'        => $detail->location_id,
            'barcode'            => $barcode,
            'return_qty'         => $qty,
            'unit_price'         => $unitPrice,
            'total_price'        => $lineTotal,
        ]);

        Inventory::create([
            'company_id'       => $purchase->company_id,
            'store_id'         => $purchase->store_id,
            'location_id'      => $detail->location_id,
            'product_id'       => $detail->product_id,
            'stock_out'        => $qty,
            'purchase_price'   => $unitPrice,
            'transaction_date' => $returnDate,
            'entry_point'      => self::ENTRY_POINT,
            'entry_no'         => $return->return_no,
            'reference_id'     => $returnDetail->id,
            'barcode'          => $barcode,
            'created_by'       => Auth::id(),
        ]);
        InventoryBarcode::addStockOut($barcode, $qty);

        return $lineTotal;
    }

    // "Purchase Return Manage": one row per returned item
    public function getReturnRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('purchase_return_details')
            ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_details.purchase_return_id')
            ->join('purchases', 'purchases.id', '=', 'purchase_returns.purchase_id')
            ->join('products', 'products.id', '=', 'purchase_return_details.product_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchase_returns.supplier_id')
            ->leftJoin('stores', 'stores.id', '=', 'purchase_returns.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'purchase_return_details.location_id')
            ->whereNull('purchase_return_details.deleted_at')
            ->whereNull('purchase_returns.deleted_at')
            ->select(
                'purchase_return_details.id',
                'purchase_return_details.purchase_return_id',
                'purchase_return_details.return_qty',
                'purchase_return_details.unit_price',
                'purchase_return_details.total_price',
                'purchase_returns.return_no',
                'purchase_returns.return_date',
                'purchase_returns.store_id',
                'purchase_returns.total_amount',
                'purchase_returns.is_refund',
                'purchase_returns.refund_amount',
                'purchases.po_no',
                'purchases.supplier_bill_no',
                'products.name as product_name',
                'products.part_number',
                'suppliers.name as supplier_name',
                'stores.name as store_name',
                'locations.name as location_name'
            );

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('purchase_returns.company_id', $ownCompanyId);
        }

        if (!empty($filters['return_no'])) {
            $query->where('purchase_returns.return_no', 'like', '%' . $filters['return_no'] . '%');
        }
        if (!empty($filters['po_no'])) {
            $query->where('purchases.po_no', 'like', '%' . $filters['po_no'] . '%');
        }
        if (!empty($filters['supplier_name'])) {
            $query->where('suppliers.name', 'like', '%' . $filters['supplier_name'] . '%');
        }
        if (!empty($filters['store_id'])) {
            $query->where('purchase_returns.store_id', $filters['store_id']);
        }
        if (!empty($filters['location_name'])) {
            $query->where('locations.name', 'like', '%' . $filters['location_name'] . '%');
        }
        if (!empty($filters['product_name'])) {
            $query->where('products.name', 'like', '%' . $filters['product_name'] . '%');
        }
        if (!empty($filters['part_number'])) {
            $query->where('products.part_number', 'like', '%' . $filters['part_number'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('purchase_returns.id')->orderBy('purchase_return_details.id')->paginate($perPage);
    }

    // Return chalan
    public function getReturn(int $id): PurchaseReturn
    {
        return PurchaseReturn::with([
            'details.product:id,name,part_number',
            'details.location:id,name',
            'purchase:id,po_no,purchase_date,supplier_bill_no',
            'supplier:id,name,phone,address',
            'store:id,name,address',
            'company:id,name,address,phone,email',
            'createdBy:id,name',
        ])->findOrFail($id);
    }

    // parts_bazar purchaseReturn/delete: the stock goes back in, the return is removed
    public function deleteReturn(PurchaseReturn $return): void
    {
        DB::beginTransaction();
        try {
            foreach ($return->details as $detail) {
                // a minus stock out puts the qty back on the barcode
                InventoryBarcode::addStockOut($detail->barcode, -$detail->return_qty);
            }

            Inventory::where('entry_point', self::ENTRY_POINT)->where('entry_no', $return->return_no)->delete();
            $return->details()->update(['deleted_at' => now()]);
            $return->update(['deleted_by' => Auth::id()]);
            $return->delete();

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function mustBeApproved(Purchase $purchase): void
    {
        if ($purchase->status != Purchase::APPROVED) {
            throw new \RuntimeException('Only an approved purchase can be returned.');
        }
    }

    // barcode given to this item when the PO was approved
    private function barcodeOf(Purchase $purchase, int $detailId): ?string
    {
        return InventoryBarcode::where('entry_point', 'purchase')
            ->where('entry_no', $purchase->po_no)
            ->where('reference_id', $detailId)
            ->value('barcode');
    }

    private function returnedQty(int $detailId): float
    {
        return (float) PurchaseReturnDetail::where('purchase_detail_id', $detailId)->sum('return_qty');
    }

    // parts_bazar priceOfThsPO_Product: total purchase price / qty (weight cost included)
    private function unitCost($detail): float
    {
        if ($detail->qty <= 0) {
            return 0;
        }

        return round($detail->total_purchase_price / $detail->qty, 2);
    }

    // company of the logged in user, null for a Super Admin
    private function ownCompanyId()
    {
        $user = Auth::user();
        if (!$user || $user->hasRole('Super Admin') || empty($user->company_id)) {
            return null;
        }

        return $user->company_id;
    }
}
