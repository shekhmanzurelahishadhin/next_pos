<?php

namespace App\Services\inventory;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Inventory pages like parts_bazar:
// "Inventory Stock" = every stock in / out row (inventories), "Inventory Barcode" = one row per barcode
class InventoryService
{
    public function getStockRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('inventories as i')
            ->join('products as p', 'p.id', '=', 'i.product_id')
            ->leftJoin('units as u', 'u.id', '=', 'p.unit_id')
            ->leftJoin('stores as st', 'st.id', '=', 'i.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'i.location_id')
            ->leftJoin('users as us', 'us.id', '=', 'i.created_by')
            ->select(
                'i.id', 'i.transaction_date', 'i.entry_point', 'i.entry_no', 'i.store_id', 'i.barcode',
                'i.stock_in', 'i.stock_out', 'i.purchase_price', 'i.created_at',
                'p.name as product_name', 'p.part_number', 'u.name as unit_name',
                'st.name as store_name', 'l.name as location_name', 'us.name as created_by_name'
            );

        $this->onlyOwnCompany($query, 'i');
        $this->commonFilters($query, $filters, 'i');

        $query
            ->when($filters['entry_point'] ?? null, fn($q, $v) => $q->where('i.entry_point', $v))
            ->when($filters['entry_no'] ?? null, fn($q, $v) => $q->where('i.entry_no', 'like', "%{$v}%"))
            ->when($filters['transaction_date'] ?? null, fn($q, $v) => $q->whereDate('i.transaction_date', $v));

        return $query->orderByDesc('i.id')->paginate($perPage ?: 10);
    }

    public function getBarcodeRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('inventory_barcodes as b')
            ->join('products as p', 'p.id', '=', 'b.product_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.product_category_id')
            ->leftJoin('brands as br', 'br.id', '=', 'p.brand_id')
            ->leftJoin('stores as st', 'st.id', '=', 'b.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'b.location_id')
            ->select(
                'b.id', 'b.transaction_date', 'b.barcode', 'b.entry_point', 'b.entry_no', 'b.store_id',
                'b.purchase_price', 'b.sell_price', 'b.stock_in', 'b.stock_out',
                DB::raw('(b.stock_in - b.stock_out) as closing_stock'),
                'p.name as product_name', 'p.part_number', 'c.name as category_name', 'br.name as brand_name',
                'st.name as store_name', 'l.name as location_name'
            );

        $this->onlyOwnCompany($query, 'b');
        $this->commonFilters($query, $filters, 'b');

        $query
            ->when($filters['entry_no'] ?? null, fn($q, $v) => $q->where('b.entry_no', 'like', "%{$v}%"))
            ->when($filters['transaction_date'] ?? null, fn($q, $v) => $q->whereDate('b.transaction_date', $v))
            // 1 = still in stock, 2 = finished
            ->when($filters['in_stock'] ?? null, fn($q, $v) => $v == 1
                ? $q->whereRaw('b.stock_in > b.stock_out')
                : $q->whereRaw('b.stock_in <= b.stock_out'));

        return $query->orderByDesc('b.id')->paginate($perPage ?: 10);
    }

    private function commonFilters($query, array $filters, string $alias): void
    {
        $query
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where("{$alias}.store_id", $v))
            ->when($filters['location_name'] ?? null, fn($q, $v) => $q->where('l.name', 'like', "%{$v}%"))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('p.name', 'like', "%{$v}%"))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('p.part_number', 'like', "%{$v}%"))
            ->when($filters['barcode'] ?? null, fn($q, $v) => $q->where("{$alias}.barcode", 'like', "%{$v}%"));
    }

    private function onlyOwnCompany($query, string $alias): void
    {
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where("{$alias}.company_id", Auth::user()->company_id);
        }
    }
}
