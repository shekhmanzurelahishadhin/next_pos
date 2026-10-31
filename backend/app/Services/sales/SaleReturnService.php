<?php

namespace App\Services\sales;

use App\Models\inventory\Inventory;
use App\Models\inventory\InventoryBarcode;
use App\Models\sales\Sale;
use App\Models\sales\SaleReturn;
use App\Models\sales\SaleReturnDetail;
use App\Services\softConfig\ScrollCodeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Sales return, same flow as parts_bazar sellDelivery/return:
// pick an approved SO, enter return qty per barcode -> stock back in, return amount lowers the customer due
// (when the money is paid back to the customer it is a refund and the due does not change)
class SaleReturnService
{
    const ENTRY_POINT = 'sale_return';

    public function __construct(private ScrollCodeService $scrollCodes)
    {
    }

    // "Sales Return" page: sold barcodes of approved SOs, one row per item
    public function getReturnableRows(array $filters = [], $perPage = 10)
    {
        $returned = DB::table('sale_return_details')->whereNull('deleted_at')
            ->select('sale_detail_id', DB::raw('SUM(return_qty) as returned_qty'))
            ->groupBy('sale_detail_id');

        $query = DB::table('sale_details as d')
            ->join('sales as s', 's.id', '=', 'd.sale_id')
            ->join('products as pr', 'pr.id', '=', 'd.product_id')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->leftJoin('stores as st', 'st.id', '=', 'd.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'd.location_id')
            ->leftJoinSub($returned, 'r', 'r.sale_detail_id', '=', 'd.id')
            ->whereNull('d.deleted_at')
            ->whereNull('s.deleted_at')
            ->where('s.status', Sale::APPROVED)
            ->select(
                'd.id', 'd.sale_id', 'd.qty', 'd.unit', 'd.barcode', 'd.sell_price',
                's.so_no', 's.order_date', 's.memo_no', 's.approved_at',
                'pr.name as product_name', 'pr.part_number',
                'c.name as customer_name', 'st.name as store_name', 'l.name as location_name',
                DB::raw('COALESCE(r.returned_qty, 0) as returned_qty')
            );

        $this->onlyOwnCompany($query, 's');

        $query
            ->when($filters['so_no'] ?? null, fn($q, $v) => $q->where('s.so_no', 'like', "%{$v}%"))
            ->when($filters['customer_name'] ?? null, fn($q, $v) => $q->where('c.name', 'like', "%{$v}%"))
            ->when($filters['memo_no'] ?? null, fn($q, $v) => $q->where('s.memo_no', 'like', "%{$v}%"))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('d.store_id', $v))
            ->when($filters['location_name'] ?? null, fn($q, $v) => $q->where('l.name', 'like', "%{$v}%"))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('pr.name', 'like', "%{$v}%"))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('pr.part_number', 'like', "%{$v}%"))
            ->when($filters['barcode'] ?? null, fn($q, $v) => $q->where('d.barcode', 'like', "%{$v}%"));

        return $query->orderByDesc('s.id')->orderBy('d.id')->paginate($perPage ?: 10);
    }

    // Return form of one SO: every sold barcode with sold, already returned and remaining qty
    public function returnForm(Sale $sale): array
    {
        $this->mustBeApproved($sale);
        $sale->load('details.product:id,name,part_number', 'details.store:id,name', 'details.location:id,name', 'customer:id,name');

        $items = $sale->details->map(fn($detail) => [
            'sale_detail_id' => $detail->id,
            'store_name'     => $detail->store?->name,
            'location_name'  => $detail->location?->name,
            'product_name'   => $detail->product?->name,
            'part_number'    => $detail->product?->part_number,
            'barcode'        => $detail->barcode,
            'unit'           => $detail->unit,
            'sold_qty'       => (float) $detail->qty,
            'returned_qty'   => $this->returnedQty($detail->id),
            'sell_price'     => (float) $detail->sell_price,
        ]);

        return [
            'sale_id'       => $sale->id,
            'so_no'         => $sale->so_no,
            'order_date'    => $sale->order_date->toDateString(),
            'memo_no'       => $sale->memo_no,
            'customer_id'   => $sale->customer_id,
            'customer_name' => $sale->customer?->name,
            'items'         => $items,
        ];
    }

    public function createReturn(Sale $sale, array $data): SaleReturn
    {
        $this->mustBeApproved($sale);

        if ($data['return_date'] < $sale->order_date->toDateString()) {
            throw new \RuntimeException('Return date can not be before the order date.');
        }

        // same SO, date and customer saved in the last 30 seconds = double click
        $duplicate = SaleReturn::where('sale_id', $sale->id)
            ->whereDate('return_date', $data['return_date'])
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        $lines = collect($data['items'])->filter(fn($item) => ($item['return_qty'] ?? 0) > 0);
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Please enter return qty!');
        }

        return DB::transaction(function () use ($sale, $data, $lines) {
            $sale->load('details');
            $isRefund = !empty($data['is_refund']);

            $return = SaleReturn::create([
                'return_no'   => $this->scrollCodes->nextNumber('sales_return', $data['return_date']),
                'max_sl_no'   => (int) SaleReturn::withTrashed()->max('max_sl_no') + 1,
                'sale_id'     => $sale->id,
                'company_id'  => $sale->company_id,
                'customer_id' => $sale->customer_id,
                'return_date' => $data['return_date'],
                'is_refund'   => $isRefund ? 1 : 0,
                'remarks'     => $data['remarks'] ?? null,
                'created_by'  => Auth::id(),
            ]);

            $total = 0;
            foreach ($lines as $line) {
                $detail = $sale->details->firstWhere('id', $line['sale_detail_id']);
                if (!$detail) {
                    throw new \RuntimeException('Item is not in this sale.');
                }

                $qty = (float) $line['return_qty'];
                $remaining = (float) $detail->qty - $this->returnedQty($detail->id);
                if ($qty > $remaining) {
                    throw new \RuntimeException('Return qty exceeded!');
                }

                // parts_bazar returns at the SO sell price
                $price = (float) $detail->sell_price;
                $lineTotal = round($price * $qty, 2);
                $total += $lineTotal;

                $returnDetail = SaleReturnDetail::create([
                    'sale_return_id' => $return->id,
                    'sale_detail_id' => $detail->id,
                    'product_id'     => $detail->product_id,
                    'store_id'       => $detail->store_id,
                    'location_id'    => $detail->location_id,
                    'barcode'        => $detail->barcode,
                    'return_qty'     => $qty,
                    'return_price'   => $price,
                    'total_price'    => $lineTotal,
                ]);

                Inventory::create([
                    'company_id'       => $sale->company_id,
                    'store_id'         => $detail->store_id,
                    'location_id'      => $detail->location_id,
                    'product_id'       => $detail->product_id,
                    'stock_in'         => $qty,
                    'purchase_price'   => $detail->purchase_price,
                    'sell_price'       => $price,
                    'transaction_date' => $data['return_date'],
                    'entry_point'      => self::ENTRY_POINT,
                    'entry_no'         => $return->return_no,
                    'reference_id'     => $returnDetail->id,
                    'barcode'          => $detail->barcode,
                    'created_by'       => Auth::id(),
                ]);
                InventoryBarcode::addStockIn($detail->barcode, $qty);
            }

            $return->update([
                'total_amount'  => $total,
                'refund_amount' => $isRefund ? $total : 0,
            ]);

            return $return;
        });
    }

    // "Sales Return Manage": one row per returned barcode
    public function getReturnRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('sale_return_details as rd')
            ->join('sale_returns as r', 'r.id', '=', 'rd.sale_return_id')
            ->join('sales as s', 's.id', '=', 'r.sale_id')
            ->join('products as pr', 'pr.id', '=', 'rd.product_id')
            ->leftJoin('customers as c', 'c.id', '=', 'r.customer_id')
            ->leftJoin('stores as st', 'st.id', '=', 'rd.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'rd.location_id')
            ->whereNull('rd.deleted_at')
            ->whereNull('r.deleted_at')
            ->select(
                'rd.id', 'rd.sale_return_id', 'rd.return_qty', 'rd.return_price', 'rd.total_price', 'rd.barcode',
                'r.return_no', 'r.return_date', 'r.total_amount', 'r.is_refund', 'r.refund_amount',
                's.so_no', 's.memo_no',
                'pr.name as product_name', 'pr.part_number',
                'c.name as customer_name', 'st.name as store_name', 'l.name as location_name'
            );

        $this->onlyOwnCompany($query, 'r');

        $query
            ->when($filters['return_no'] ?? null, fn($q, $v) => $q->where('r.return_no', 'like', "%{$v}%"))
            ->when($filters['so_no'] ?? null, fn($q, $v) => $q->where('s.so_no', 'like', "%{$v}%"))
            ->when($filters['customer_name'] ?? null, fn($q, $v) => $q->where('c.name', 'like', "%{$v}%"))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('rd.store_id', $v))
            ->when($filters['location_name'] ?? null, fn($q, $v) => $q->where('l.name', 'like', "%{$v}%"))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('pr.name', 'like', "%{$v}%"))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('pr.part_number', 'like', "%{$v}%"))
            ->when($filters['barcode'] ?? null, fn($q, $v) => $q->where('rd.barcode', 'like', "%{$v}%"));

        return $query->orderByDesc('r.id')->orderBy('rd.id')->paginate($perPage ?: 10);
    }

    // Return chalan
    public function getReturn(int $id): SaleReturn
    {
        return SaleReturn::with([
            'details.product:id,name,part_number',
            'details.location:id,name',
            'details.saleDetail:id,qty,unit',
            'sale:id,so_no,order_date,memo_no',
            'customer:id,name,phone,address',
            'company:id,name,address,phone,email',
            'createdBy:id,name',
        ])->findOrFail($id);
    }

    // parts_bazar sellReturn/delete: stock goes back out, the return is removed
    public function deleteReturn(SaleReturn $return): void
    {
        DB::transaction(function () use ($return) {
            foreach ($return->details as $detail) {
                InventoryBarcode::addStockIn($detail->barcode, -$detail->return_qty);
            }
            Inventory::where('entry_point', self::ENTRY_POINT)->where('entry_no', $return->return_no)->delete();
            $return->details()->update(['deleted_at' => now()]);
            $return->update(['deleted_by' => Auth::id()]);
            $return->delete();
        });
    }

    private function mustBeApproved(Sale $sale): void
    {
        if ($sale->status != Sale::APPROVED) {
            throw new \RuntimeException('Only an approved sale can be returned.');
        }
    }

    private function returnedQty(int $detailId): float
    {
        return (float) SaleReturnDetail::where('sale_detail_id', $detailId)->sum('return_qty');
    }

    private function onlyOwnCompany($query, string $alias): void
    {
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where("{$alias}.company_id", Auth::user()->company_id);
        }
    }
}
