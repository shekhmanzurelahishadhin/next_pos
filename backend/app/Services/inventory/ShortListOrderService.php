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
        return DB::transaction(function () use ($items) {
            // lock so two users never get the same number
            $maxSlNo = (int) ShortListOrder::lockForUpdate()->max('max_sl_no') + 1;
            $companies = Store::whereIn('id', array_column($items, 'store_id'))->pluck('company_id', 'id');

            foreach ($items as $item) {
                ShortListOrder::create([
                    'max_sl_no'      => $maxSlNo,
                    'company_id'     => $companies[$item['store_id']] ?? null,
                    'store_id'       => $item['store_id'],
                    'product_id'     => $item['product_id'],
                    'code'           => $item['code'] ?? null,
                    'stock_qty'      => $item['stock_qty'] ?? 0,
                    'purchase_price' => $item['purchase_price'],
                    'order_qty'      => $item['order_qty'],
                    'created_by'     => Auth::id(),
                ]);
            }
            return $maxSlNo;
        });
    }

    // Manage Short List Order: one row per product line
    public function getRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('short_list_orders as s')
            ->join('products as pr', 'pr.id', '=', 's.product_id')
            ->leftJoin('stores as st', 'st.id', '=', 's.store_id')
            ->select(
                's.id', 's.max_sl_no', 's.store_id', 's.code', 's.stock_qty', 's.purchase_price', 's.order_qty', 's.created_at',
                'pr.name as product_name', 'st.name as store_name'
            );

        $this->onlyOwnCompany($query, 's');

        $query
            ->when($filters['max_sl_no'] ?? null, fn($q, $v) => $q->where('s.max_sl_no', $v))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('s.store_id', $v))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('pr.name', 'like', "%{$v}%"))
            ->when($filters['code'] ?? null, fn($q, $v) => $q->where('s.code', 'like', "%{$v}%"));

        return $query->orderByDesc('s.max_sl_no')->orderBy('s.id')->paginate($perPage ?: 10);
    }

    // Short list report of one max_sl_no
    public function getList(int $maxSlNo): array
    {
        $query = ShortListOrder::with(['store:id,name', 'product:id,name,part_number', 'company:id,name,address,phone,email', 'createdBy:id,name'])
            ->where('max_sl_no', $maxSlNo);
        $this->onlyOwnCompany($query, 'short_list_orders');
        $lines = $query->orderBy('id')->get();

        if ($lines->isEmpty()) {
            throw new \RuntimeException('Short list not found');
        }
        return [
            'max_sl_no'  => $maxSlNo,
            'created_at' => $lines->first()->created_at,
            'company'    => $lines->first()->company,
            'created_by' => $lines->first()->createdBy?->name,
            'lines'      => $lines,
        ];
    }

    // Delete the whole list, like parts_bazar actionDelete($max_sl_no)
    public function deleteList(int $maxSlNo): void
    {
        $query = ShortListOrder::where('max_sl_no', $maxSlNo);
        $this->onlyOwnCompany($query, 'short_list_orders');
        if ($query->delete() === 0) {
            throw new \RuntimeException('Short list not found');
        }
    }

    private function onlyOwnCompany($query, string $alias): void
    {
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where("{$alias}.company_id", Auth::user()->company_id);
        }
    }
}
