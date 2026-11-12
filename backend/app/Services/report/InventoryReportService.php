<?php

namespace App\Services\report;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Inventory reports like parts_bazar inventory/stockReportViewInAmount
class InventoryReportService
{
    // Stock Qty Report (also used by the Stock Amount Report)
    // One row per product + barcode with opening, in, out, closing stock and the purchase amount.
    // show = "current": only barcodes with stock in / out between the dates
    // show = "all":     every barcode that has any stock
    public function stockQty(array $filters): array
    {
        $startDate = $filters['start_date'];
        $endDate = $filters['end_date'];

        $query = DB::table('inventories')
            ->join('products', 'products.id', '=', 'inventories.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.product_category_id')
            ->leftJoin('brands', 'brands.id', '=', 'products.brand_id')
            ->leftJoin('inventory_barcodes', 'inventory_barcodes.barcode', '=', 'inventories.barcode')
            ->select(
                'inventories.product_id',
                'inventories.barcode',
                'products.name as product_name',
                'products.part_number',
                'categories.name as category_name',
                'brands.name as brand_name',
                'inventory_barcodes.purchase_price'
            )
            // opening = stock before the start date, closing = stock up to the end date
            ->selectRaw('SUM(CASE WHEN inventories.transaction_date < ? THEN inventories.stock_in - inventories.stock_out ELSE 0 END) AS opening_stock', [$startDate])
            ->selectRaw('SUM(CASE WHEN inventories.transaction_date BETWEEN ? AND ? THEN inventories.stock_in ELSE 0 END) AS stock_in', [$startDate, $endDate])
            ->selectRaw('SUM(CASE WHEN inventories.transaction_date BETWEEN ? AND ? THEN inventories.stock_out ELSE 0 END) AS stock_out', [$startDate, $endDate])
            ->selectRaw('SUM(CASE WHEN inventories.transaction_date <= ? THEN inventories.stock_in - inventories.stock_out ELSE 0 END) AS closing_stock', [$endDate])
            ->selectRaw('MIN(inventories.id) AS first_id')
            ->groupBy(
                'inventories.product_id',
                'inventories.barcode',
                'products.name',
                'products.part_number',
                'categories.name',
                'brands.name',
                'inventory_barcodes.purchase_price'
            );

        // a company user can only see the stock of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('inventories.company_id', $ownCompanyId);
        }

        if (!empty($filters['company_id'])) {
            $query->where('inventories.company_id', $filters['company_id']);
        }
        if (!empty($filters['store_id'])) {
            $query->where('inventories.store_id', $filters['store_id']);
        }
        if (!empty($filters['location_id'])) {
            $query->where('inventories.location_id', $filters['location_id']);
        }
        if (!empty($filters['category_id'])) {
            $query->where('products.product_category_id', $filters['category_id']);
        }
        // parts_bazar "Product Type" (prod_brands) = sub category here
        if (!empty($filters['sub_category_id'])) {
            $query->where('products.sub_category_id', $filters['sub_category_id']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('inventories.product_id', $filters['product_id']);
        }
        if (!empty($filters['barcode'])) {
            $query->where('inventories.barcode', $filters['barcode']);
        }

        $show = $filters['show'] ?? 'current';
        if ($show == 'current') {
            $query->havingRaw('(stock_in <> 0 OR stock_out <> 0)');
        } else {
            $query->havingRaw('(opening_stock > 0 OR stock_in > 0 OR stock_out > 0 OR closing_stock > 0)');
        }

        // first stock entry first
        $records = $query->orderBy('first_id')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->opening_stock = (float) $record->opening_stock;
            $record->stock_in = (float) $record->stock_in;
            $record->stock_out = (float) $record->stock_out;
            $record->closing_stock = (float) $record->closing_stock;
            $record->purchase_price = (float) $record->purchase_price;
            $record->total_amount = round($record->closing_stock * $record->purchase_price, 2);
            unset($record->first_id);
            $rows[] = $record;
        }

        $storeName = null;
        if (!empty($filters['store_id'])) {
            $storeName = DB::table('stores')->where('id', $filters['store_id'])->value('name');
        }

        $locationName = null;
        if (!empty($filters['location_id'])) {
            $locationName = DB::table('locations')->where('id', $filters['location_id'])->value('name');
        }

        return [
            'rows' => $rows,
            'company' => $this->company($filters['company_id'] ?? null),
            'store' => $storeName,
            'location' => $locationName,
        ];
    }

    // Alert Quantity Report (parts_bazar inventory/alertQtyReport)
    // Products that have stock entries and whose closing stock is at or under the product alert qty.
    public function alertQty(array $filters): array
    {
        $query = $this->productQuery($filters);

        // only products that have stock entries
        $query->joinSub($this->closingStockByProduct(), 'stock', 'stock.product_id', '=', 'products.id');
        $query->whereRaw('COALESCE(products.alert_qty, 0) >= stock.closing_stock');
        $query->addSelect('stock.closing_stock', 'products.alert_qty');

        $records = $query->orderBy('products.id')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->closing_stock = (float) $record->closing_stock;
            $record->alert_qty = (float) $record->alert_qty;
            $rows[] = $record;
        }

        return $rows;
    }

    // Out Of Stock Report (parts_bazar inventory/outOfStockReport)
    // Every product with no stock left, products that were never bought too.
    public function outOfStock(array $filters): array
    {
        $query = $this->productQuery($filters);

        // left join, so products with no stock entry are kept (their stock is 0)
        $query->leftJoinSub($this->closingStockByProduct(), 'stock', 'stock.product_id', '=', 'products.id');
        $query->whereRaw('COALESCE(stock.closing_stock, 0) <= 0');

        // products with no company belong to every company
        if (!empty($filters['company_id'])) {
            $companyId = $filters['company_id'];
            $query->where(function ($where) use ($companyId) {
                $where->where('products.company_id', $companyId)->orWhereNull('products.company_id');
            });
        }

        return $query->orderBy('products.id')->get()->all();
    }

    // products with the filters of the Alert Qty and Out Of Stock reports
    private function productQuery(array $filters)
    {
        $query = DB::table('products')
            ->leftJoin('sub_categories', 'sub_categories.id', '=', 'products.sub_category_id')
            ->leftJoin('brands', 'brands.id', '=', 'products.brand_id')
            ->whereNull('products.deleted_at')
            ->select(
                'products.id',
                'products.name as product_name',
                'products.part_number',
                'sub_categories.name as sub_category_name',
                'brands.name as brand_name'
            );

        // a company user sees own products and the products with no company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where(function ($where) use ($ownCompanyId) {
                $where->where('products.company_id', $ownCompanyId)->orWhereNull('products.company_id');
            });
        }

        if (!empty($filters['sub_category_id'])) {
            $query->where('products.sub_category_id', $filters['sub_category_id']);
        }
        if (!empty($filters['brand_id'])) {
            $query->where('products.brand_id', $filters['brand_id']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('products.id', $filters['product_id']);
        }

        return $query;
    }

    // closing stock (all stock in - all stock out) of every product
    private function closingStockByProduct()
    {
        $query = DB::table('inventories')
            ->select('product_id')
            ->selectRaw('SUM(stock_in - stock_out) AS closing_stock')
            ->groupBy('product_id');

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('company_id', $ownCompanyId);
        }

        return $query;
    }

    // product picker of the report search forms: search by name or part number
    public function searchProducts(string $term)
    {
        $query = DB::table('products')
            ->whereNull('deleted_at')
            ->where(function ($where) use ($term) {
                $where->where('name', 'like', "%{$term}%")->orWhere('part_number', 'like', "%{$term}%");
            })
            ->select('id', 'name', 'part_number');

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('company_id', $ownCompanyId);
        }

        return $query->orderBy('name')->limit(20)->get();
    }

    // the company shown in the report header: the picked company, or else the user's own company
    public function company($companyId = null)
    {
        if (!$companyId && Auth::user()) {
            $companyId = Auth::user()->company_id;
        }

        if (!$companyId) {
            return null;
        }

        return DB::table('companies')->where('id', $companyId)->select('name', 'address', 'phone', 'logo')->first();
    }

    // company of the logged in user, null for a Super Admin (who can see every company)
    public function ownCompanyId()
    {
        $user = Auth::user();
        if (!$user || $user->hasRole('Super Admin') || empty($user->company_id)) {
            return null;
        }

        return $user->company_id;
    }
}
