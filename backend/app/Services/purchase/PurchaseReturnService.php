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
// pick an approved PO, enter return qty per item -> stock out, return amount lowers the supplier due
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
        $returned = DB::table('purchase_return_details')->whereNull('deleted_at')
            ->select('purchase_detail_id', DB::raw('SUM(return_qty) as returned_qty'))
            ->groupBy('purchase_detail_id');

        $query = DB::table('purchase_details as d')
            ->join('purchases as p', 'p.id', '=', 'd.purchase_id')
            ->join('products as pr', 'pr.id', '=', 'd.product_id')
            ->leftJoin('suppliers as s', 's.id', '=', 'p.supplier_id')
            ->leftJoin('stores as st', 'st.id', '=', 'p.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'd.location_id')
            ->leftJoinSub($returned, 'r', 'r.purchase_detail_id', '=', 'd.id')
            ->whereNull('d.deleted_at')
            ->whereNull('p.deleted_at')
            ->where('p.status', Purchase::APPROVED)
            ->select(
                'd.id', 'd.purchase_id', 'd.qty', 'd.unit',
                'p.po_no', 'p.purchase_date', 'p.supplier_bill_no',
                'pr.name as product_name', 'pr.part_number',
                's.name as supplier_name', 'st.name as store_name', 'l.name as location_name',
                DB::raw('COALESCE(r.returned_qty, 0) as returned_qty')
            );

        $this->onlyOwnCompany($query);

        $query
            ->when($filters['po_no'] ?? null, fn($q, $v) => $q->where('p.po_no', 'like', "%{$v}%"))
            ->when($filters['supplier_name'] ?? null, fn($q, $v) => $q->where('s.name', 'like', "%{$v}%"))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('p.store_id', $v))
            ->when($filters['location_name'] ?? null, fn($q, $v) => $q->where('l.name', 'like', "%{$v}%"))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('pr.name', 'like', "%{$v}%"))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('pr.part_number', 'like', "%{$v}%"));

        return $query->orderByDesc('p.id')->orderBy('d.id')->paginate($perPage ?: 10);
    }

    // Return form of one PO: every item with received, already returned and in stock qty
    public function returnForm(Purchase $purchase): array
    {
        $this->mustBeApproved($purchase);
        $purchase->load('details.product:id,name,part_number', 'details.location:id,name', 'supplier:id,name', 'store:id,name');

        $items = $purchase->details->map(function ($detail) use ($purchase) {
            $barcode = $this->barcodeOf($purchase, $detail->id);
            return [
                'purchase_detail_id' => $detail->id,
                'product_name'       => $detail->product?->name,
                'part_number'        => $detail->product?->part_number,
                'location_name'      => $detail->location?->name,
                'barcode'            => $barcode,
                'received_qty'       => (float) $detail->qty,
                'returned_qty'       => $this->returnedQty($detail->id),
                'closing_stock'      => $this->barcodeStock($barcode),
                'unit_price'         => $this->unitCost($detail),
            ];
        });

        return [
            'purchase_id'   => $purchase->id,
            'po_no'         => $purchase->po_no,
            'purchase_date' => $purchase->purchase_date->toDateString(),
            'supplier_id'   => $purchase->supplier_id,
            'supplier_name' => $purchase->supplier?->name,
            'store_name'    => $purchase->store?->name,
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

        $lines = collect($data['items'])->filter(fn($item) => $item['return_qty'] > 0);
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Please enter return qty!');
        }

        return DB::transaction(function () use ($purchase, $data, $lines) {
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

                $qty = (float) $line['return_qty'];
                $barcode = $this->barcodeOf($purchase, $detail->id);
                $remaining = (float) $detail->qty - $this->returnedQty($detail->id);
                if ($qty > $remaining || $qty > $this->barcodeStock($barcode)) {
                    throw new \RuntimeException('Return Qty cannot be greater than Closing Stock or Remaining Qty.');
                }

                $unitPrice = $this->unitCost($detail);
                $lineTotal = round($unitPrice * $qty, 2);
                $total += $lineTotal;

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
                    'transaction_date' => $data['return_date'],
                    'entry_point'      => self::ENTRY_POINT,
                    'entry_no'         => $return->return_no,
                    'reference_id'     => $returnDetail->id,
                    'barcode'          => $barcode,
                    'created_by'       => Auth::id(),
                ]);
                InventoryBarcode::addStockOut($barcode, $qty);
            }

            $return->update([
                'total_amount'  => $total,
                'refund_amount' => $isRefund ? $total : 0,
            ]);

            return $return;
        });
    }

    // "Purchase Return Manage": one row per returned item
    public function getReturnRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('purchase_return_details as rd')
            ->join('purchase_returns as r', 'r.id', '=', 'rd.purchase_return_id')
            ->join('purchases as p', 'p.id', '=', 'r.purchase_id')
            ->join('products as pr', 'pr.id', '=', 'rd.product_id')
            ->leftJoin('suppliers as s', 's.id', '=', 'r.supplier_id')
            ->leftJoin('stores as st', 'st.id', '=', 'r.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'rd.location_id')
            ->whereNull('rd.deleted_at')
            ->whereNull('r.deleted_at')
            ->select(
                'rd.id', 'rd.purchase_return_id', 'rd.return_qty', 'rd.unit_price', 'rd.total_price',
                'r.return_no', 'r.return_date', 'r.store_id', 'r.total_amount', 'r.is_refund', 'r.refund_amount',
                'p.po_no', 'p.supplier_bill_no',
                'pr.name as product_name', 'pr.part_number',
                's.name as supplier_name', 'st.name as store_name', 'l.name as location_name'
            );

        $this->onlyOwnCompany($query, 'r');

        $query
            ->when($filters['return_no'] ?? null, fn($q, $v) => $q->where('r.return_no', 'like', "%{$v}%"))
            ->when($filters['po_no'] ?? null, fn($q, $v) => $q->where('p.po_no', 'like', "%{$v}%"))
            ->when($filters['supplier_name'] ?? null, fn($q, $v) => $q->where('s.name', 'like', "%{$v}%"))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('r.store_id', $v))
            ->when($filters['location_name'] ?? null, fn($q, $v) => $q->where('l.name', 'like', "%{$v}%"))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('pr.name', 'like', "%{$v}%"))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('pr.part_number', 'like', "%{$v}%"));

        return $query->orderByDesc('r.id')->orderBy('rd.id')->paginate($perPage ?: 10);
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

    // parts_bazar purchaseReturn/delete: stock goes back in, the return is removed
    public function deleteReturn(PurchaseReturn $return): void
    {
        DB::transaction(function () use ($return) {
            foreach ($return->details as $detail) {
                InventoryBarcode::addStockOut($detail->barcode, -$detail->return_qty);
            }
            Inventory::where('entry_point', self::ENTRY_POINT)->where('entry_no', $return->return_no)->delete();
            $return->details()->update(['deleted_at' => now()]);
            $return->update(['deleted_by' => Auth::id()]);
            $return->delete();
        });
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
        return InventoryBarcode::where('entry_point', 'purchase')->where('entry_no', $purchase->po_no)
            ->where('reference_id', $detailId)->value('barcode');
    }

    private function barcodeStock(?string $barcode): float
    {
        return InventoryBarcode::closingStock($barcode);
    }

    private function returnedQty(int $detailId): float
    {
        return (float) PurchaseReturnDetail::where('purchase_detail_id', $detailId)->sum('return_qty');
    }

    // parts_bazar priceOfThsPO_Product: total purchase price / qty (weight cost included)
    private function unitCost($detail): float
    {
        return $detail->qty > 0 ? round($detail->total_purchase_price / $detail->qty, 2) : 0;
    }

    private function onlyOwnCompany($query, string $alias = 'p'): void
    {
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where("{$alias}.company_id", Auth::user()->company_id);
        }
    }
}
