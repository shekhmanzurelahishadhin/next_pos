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
        // how much of each sold item was already returned
        $returned = DB::table('sale_return_details')
            ->whereNull('deleted_at')
            ->select('sale_detail_id', DB::raw('SUM(return_qty) as returned_qty'))
            ->groupBy('sale_detail_id');

        $query = DB::table('sale_details')
            ->join('sales', 'sales.id', '=', 'sale_details.sale_id')
            ->join('products', 'products.id', '=', 'sale_details.product_id')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->leftJoin('stores', 'stores.id', '=', 'sale_details.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'sale_details.location_id')
            ->leftJoinSub($returned, 'returned', 'returned.sale_detail_id', '=', 'sale_details.id')
            ->whereNull('sale_details.deleted_at')
            ->whereNull('sales.deleted_at')
            ->where('sales.status', Sale::APPROVED)
            ->select(
                'sale_details.id',
                'sale_details.sale_id',
                'sale_details.qty',
                'sale_details.unit',
                'sale_details.barcode',
                'sale_details.sell_price',
                'sales.so_no',
                'sales.order_date',
                'sales.memo_no',
                'sales.approved_at',
                'products.name as product_name',
                'products.part_number',
                'customers.name as customer_name',
                'stores.name as store_name',
                'locations.name as location_name',
                DB::raw('COALESCE(returned.returned_qty, 0) as returned_qty')
            );

        // a company user can only see the sales of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('sales.company_id', $ownCompanyId);
        }

        if (!empty($filters['so_no'])) {
            $query->where('sales.so_no', 'like', '%' . $filters['so_no'] . '%');
        }
        if (!empty($filters['customer_name'])) {
            $query->where('customers.name', 'like', '%' . $filters['customer_name'] . '%');
        }
        if (!empty($filters['memo_no'])) {
            $query->where('sales.memo_no', 'like', '%' . $filters['memo_no'] . '%');
        }
        if (!empty($filters['store_id'])) {
            $query->where('sale_details.store_id', $filters['store_id']);
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
        if (!empty($filters['barcode'])) {
            $query->where('sale_details.barcode', 'like', '%' . $filters['barcode'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('sales.id')->orderBy('sale_details.id')->paginate($perPage);
    }

    // Return form of one SO: every sold barcode with sold, already returned and remaining qty
    public function returnForm(Sale $sale): array
    {
        $this->mustBeApproved($sale);
        $sale->load('details.product:id,name,part_number', 'details.store:id,name', 'details.location:id,name', 'customer:id,name');

        $items = [];
        foreach ($sale->details as $detail) {
            $productName = null;
            $partNumber = null;
            if ($detail->product) {
                $productName = $detail->product->name;
                $partNumber = $detail->product->part_number;
            }
            $storeName = null;
            if ($detail->store) {
                $storeName = $detail->store->name;
            }
            $locationName = null;
            if ($detail->location) {
                $locationName = $detail->location->name;
            }

            $items[] = [
                'sale_detail_id' => $detail->id,
                'store_name'     => $storeName,
                'location_name'  => $locationName,
                'product_name'   => $productName,
                'part_number'    => $partNumber,
                'barcode'        => $detail->barcode,
                'unit'           => $detail->unit,
                'sold_qty'       => (float) $detail->qty,
                'returned_qty'   => $this->returnedQty($detail->id),
                'sell_price'     => (float) $detail->sell_price,
            ];
        }

        $customerName = null;
        if ($sale->customer) {
            $customerName = $sale->customer->name;
        }

        return [
            'sale_id'       => $sale->id,
            'so_no'         => $sale->so_no,
            'order_date'    => $sale->order_date->toDateString(),
            'memo_no'       => $sale->memo_no,
            'customer_id'   => $sale->customer_id,
            'customer_name' => $customerName,
            'items'         => $items,
        ];
    }

    public function createReturn(Sale $sale, array $data): SaleReturn
    {
        $this->mustBeApproved($sale);

        if ($data['return_date'] < $sale->order_date->toDateString()) {
            throw new \RuntimeException('Return date can not be before the order date.');
        }

        // same SO and date saved in the last 30 seconds = double click
        $duplicate = SaleReturn::where('sale_id', $sale->id)
            ->whereDate('return_date', $data['return_date'])
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        // only the items with a return qty
        $lines = [];
        foreach ($data['items'] as $item) {
            if (($item['return_qty'] ?? 0) > 0) {
                $lines[] = $item;
            }
        }
        if (count($lines) === 0) {
            throw new \RuntimeException('Please enter return qty!');
        }

        DB::beginTransaction();
        try {
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
                $total += $this->returnItem($sale, $return, $line, $data['return_date']);
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

    // One returned item: a return detail, a stock in row and more stock in its barcode.
    // Gives back the line total.
    private function returnItem(Sale $sale, SaleReturn $return, array $line, string $returnDate): float
    {
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
            'transaction_date' => $returnDate,
            'entry_point'      => self::ENTRY_POINT,
            'entry_no'         => $return->return_no,
            'reference_id'     => $returnDetail->id,
            'barcode'          => $detail->barcode,
            'created_by'       => Auth::id(),
        ]);
        InventoryBarcode::addStockIn($detail->barcode, $qty);

        return $lineTotal;
    }

    // "Sales Return Manage": one row per returned barcode
    public function getReturnRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('sale_return_details')
            ->join('sale_returns', 'sale_returns.id', '=', 'sale_return_details.sale_return_id')
            ->join('sales', 'sales.id', '=', 'sale_returns.sale_id')
            ->join('products', 'products.id', '=', 'sale_return_details.product_id')
            ->leftJoin('customers', 'customers.id', '=', 'sale_returns.customer_id')
            ->leftJoin('stores', 'stores.id', '=', 'sale_return_details.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'sale_return_details.location_id')
            ->whereNull('sale_return_details.deleted_at')
            ->whereNull('sale_returns.deleted_at')
            ->select(
                'sale_return_details.id',
                'sale_return_details.sale_return_id',
                'sale_return_details.return_qty',
                'sale_return_details.return_price',
                'sale_return_details.total_price',
                'sale_return_details.barcode',
                'sale_returns.return_no',
                'sale_returns.return_date',
                'sale_returns.total_amount',
                'sale_returns.is_refund',
                'sale_returns.refund_amount',
                'sales.so_no',
                'sales.memo_no',
                'products.name as product_name',
                'products.part_number',
                'customers.name as customer_name',
                'stores.name as store_name',
                'locations.name as location_name'
            );

        // a company user can only see the returns of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('sale_returns.company_id', $ownCompanyId);
        }

        if (!empty($filters['return_no'])) {
            $query->where('sale_returns.return_no', 'like', '%' . $filters['return_no'] . '%');
        }
        if (!empty($filters['so_no'])) {
            $query->where('sales.so_no', 'like', '%' . $filters['so_no'] . '%');
        }
        if (!empty($filters['customer_name'])) {
            $query->where('customers.name', 'like', '%' . $filters['customer_name'] . '%');
        }
        if (!empty($filters['store_id'])) {
            $query->where('sale_return_details.store_id', $filters['store_id']);
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
        if (!empty($filters['barcode'])) {
            $query->where('sale_return_details.barcode', 'like', '%' . $filters['barcode'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('sale_returns.id')->orderBy('sale_return_details.id')->paginate($perPage);
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
        DB::beginTransaction();
        try {
            foreach ($return->details as $detail) {
                InventoryBarcode::addStockIn($detail->barcode, -$detail->return_qty);
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

    private function mustBeApproved(Sale $sale): void
    {
        if ($sale->status != Sale::APPROVED) {
            throw new \RuntimeException('Only an approved sale can be returned.');
        }
    }

    // qty of one sold item that was already returned
    private function returnedQty(int $detailId): float
    {
        return (float) SaleReturnDetail::where('sale_detail_id', $detailId)->sum('return_qty');
    }

    // company of the logged in user, null for a Super Admin (who can see every company)
    private function ownCompanyId()
    {
        $user = Auth::user();
        if (!$user || $user->hasRole('Super Admin') || empty($user->company_id)) {
            return null;
        }

        return $user->company_id;
    }
}
