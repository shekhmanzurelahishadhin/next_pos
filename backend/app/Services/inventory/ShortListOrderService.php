<?php

namespace App\Services\inventory;

use App\Models\inventory\ShortListOrder;
use App\Models\softConfig\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ShortListOrderService
{
    // "Create PR": save every grid line under one new max_sl_no, like parts_bazar actionSave
    public function createList(array $items): int
    {
        DB::beginTransaction();
        try {
            // lock the table, so two users never get the same number
            $maxSlNo = (int) ShortListOrder::lockForUpdate()->max('max_sl_no') + 1;

            foreach ($items as $item) {
                $store = Store::find($item['store_id']);

                ShortListOrder::create([
                    'max_sl_no'      => $maxSlNo,
                    'company_id'     => $store ? $store->company_id : null,
                    'store_id'       => $item['store_id'],
                    'product_id'     => $item['product_id'],
                    'code'           => $item['code'] ?? null,
                    'stock_qty'      => $item['stock_qty'] ?? 0,
                    'purchase_price' => $item['purchase_price'],
                    'order_qty'      => $item['order_qty'],
                    'created_by'     => Auth::id(),
                ]);
            }

            DB::commit();
            return $maxSlNo;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Manage Short List Order: one row per product line
    public function getRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('short_list_orders')
            ->join('products', 'products.id', '=', 'short_list_orders.product_id')
            ->leftJoin('stores', 'stores.id', '=', 'short_list_orders.store_id')
            ->select(
                'short_list_orders.id',
                'short_list_orders.max_sl_no',
                'short_list_orders.store_id',
                'short_list_orders.code',
                'short_list_orders.stock_qty',
                'short_list_orders.purchase_price',
                'short_list_orders.order_qty',
                'short_list_orders.created_at',
                'products.name as product_name',
                'stores.name as store_name'
            );

        $this->onlyOwnCompany($query);

        if (!empty($filters['max_sl_no'])) {
            $query->where('short_list_orders.max_sl_no', $filters['max_sl_no']);
        }
        if (!empty($filters['store_id'])) {
            $query->where('short_list_orders.store_id', $filters['store_id']);
        }
        if (!empty($filters['product_name'])) {
            $query->where('products.name', 'like', '%' . $filters['product_name'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('short_list_orders.code', 'like', '%' . $filters['code'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('short_list_orders.max_sl_no')->orderBy('short_list_orders.id')->paginate($perPage);
    }

    // Short list report of one max_sl_no
    public function getList(int $maxSlNo): array
    {
        $query = ShortListOrder::with(['store:id,name', 'product:id,name,part_number', 'company:id,name,address,phone,email', 'createdBy:id,name'])
            ->where('max_sl_no', $maxSlNo);
        $this->onlyOwnCompany($query);

        $lines = $query->orderBy('id')->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Short list not found');
        }

        $first = $lines->first();

        return [
            'max_sl_no'  => $maxSlNo,
            'created_at' => $first->created_at,
            'company'    => $first->company,
            'created_by' => $first->createdBy ? $first->createdBy->name : null,
            'lines'      => $lines,
        ];
    }

    // Delete the whole list, like parts_bazar actionDelete($max_sl_no)
    public function deleteList(int $maxSlNo): void
    {
        $query = ShortListOrder::where('max_sl_no', $maxSlNo);
        $this->onlyOwnCompany($query);

        $deletedCount = $query->delete();
        if ($deletedCount == 0) {
            throw new \RuntimeException('Short list not found');
        }
    }

    // a company user can only see the lists of own company
    private function onlyOwnCompany($query): void
    {
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            $query->where('short_list_orders.company_id', $user->company_id);
        }
    }
}
