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
        $query = DB::table('inventories')
            ->join('products', 'products.id', '=', 'inventories.product_id')
            ->leftJoin('units', 'units.id', '=', 'products.unit_id')
            ->leftJoin('stores', 'stores.id', '=', 'inventories.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'inventories.location_id')
            ->leftJoin('users', 'users.id', '=', 'inventories.created_by')
            ->select(
                'inventories.id',
                'inventories.transaction_date',
                'inventories.entry_point',
                'inventories.entry_no',
                'inventories.store_id',
                'inventories.barcode',
                'inventories.stock_in',
                'inventories.stock_out',
                'inventories.purchase_price',
                'inventories.created_at',
                'products.name as product_name',
                'products.part_number',
                'units.name as unit_name',
                'stores.name as store_name',
                'locations.name as location_name',
                'users.name as created_by_name'
            );

        $this->onlyOwnCompany($query, 'inventories');
        $this->commonFilters($query, $filters, 'inventories');

        if (!empty($filters['entry_point'])) {
            $query->where('inventories.entry_point', $filters['entry_point']);
        }
        if (!empty($filters['entry_no'])) {
            $query->where('inventories.entry_no', 'like', '%' . $filters['entry_no'] . '%');
        }
        if (!empty($filters['transaction_date'])) {
            $query->whereDate('inventories.transaction_date', $filters['transaction_date']);
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('inventories.id')->paginate($perPage);
    }

    public function getBarcodeRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('inventory_barcodes')
            ->join('products', 'products.id', '=', 'inventory_barcodes.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.product_category_id')
            ->leftJoin('brands', 'brands.id', '=', 'products.brand_id')
            ->leftJoin('stores', 'stores.id', '=', 'inventory_barcodes.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'inventory_barcodes.location_id')
            ->select(
                'inventory_barcodes.id',
                'inventory_barcodes.transaction_date',
                'inventory_barcodes.barcode',
                'inventory_barcodes.entry_point',
                'inventory_barcodes.entry_no',
                'inventory_barcodes.store_id',
                'inventory_barcodes.purchase_price',
                'inventory_barcodes.sell_price',
                'inventory_barcodes.stock_in',
                'inventory_barcodes.stock_out'
            )
            ->selectRaw('(inventory_barcodes.stock_in - inventory_barcodes.stock_out) as closing_stock')
            ->addSelect(
                'products.name as product_name',
                'products.part_number',
                'categories.name as category_name',
                'brands.name as brand_name',
                'stores.name as store_name',
                'locations.name as location_name'
            );

        $this->onlyOwnCompany($query, 'inventory_barcodes');
        $this->commonFilters($query, $filters, 'inventory_barcodes');

        if (!empty($filters['entry_no'])) {
            $query->where('inventory_barcodes.entry_no', 'like', '%' . $filters['entry_no'] . '%');
        }
        if (!empty($filters['transaction_date'])) {
            $query->whereDate('inventory_barcodes.transaction_date', $filters['transaction_date']);
        }

        // in_stock: 1 = still in stock, 2 = finished
        if (!empty($filters['in_stock'])) {
            if ($filters['in_stock'] == 1) {
                $query->whereRaw('inventory_barcodes.stock_in > inventory_barcodes.stock_out');
            } else {
                $query->whereRaw('inventory_barcodes.stock_in <= inventory_barcodes.stock_out');
            }
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('inventory_barcodes.id')->paginate($perPage);
    }

    // filters both lists have; $table is "inventories" or "inventory_barcodes"
    private function commonFilters($query, array $filters, string $table): void
    {
        if (!empty($filters['store_id'])) {
            $query->where($table . '.store_id', $filters['store_id']);
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
            $query->where($table . '.barcode', 'like', '%' . $filters['barcode'] . '%');
        }
    }

    // a company user can only see the stock of own company
    private function onlyOwnCompany($query, string $table): void
    {
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            $query->where($table . '.company_id', $user->company_id);
        }
    }
}
