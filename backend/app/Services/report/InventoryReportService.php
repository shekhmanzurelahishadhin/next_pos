<?php

namespace App\Services\report;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Inventory reports like parts_bazar inventory/stockReportViewInAmount
class InventoryReportService
{
    // Stock Qty Report: one row per product + barcode with opening, in, out, closing and the purchase amount.
    // "current" = only barcodes with stock in / out between the dates, "all" = every barcode with stock.
    public function stockQty(array $filters): array
    {
        $start = $filters['start_date'];
        $end = $filters['end_date'];

        $query = DB::table('inventories as i')
            ->join('products as p', 'p.id', '=', 'i.product_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.product_category_id')
            ->leftJoin('brands as br', 'br.id', '=', 'p.brand_id')
            ->leftJoin('inventory_barcodes as b', 'b.barcode', '=', 'i.barcode')
            ->selectRaw('
                SUM(CASE WHEN i.transaction_date < ? THEN i.stock_in - i.stock_out ELSE 0 END) AS opening_stock,
                SUM(CASE WHEN i.transaction_date BETWEEN ? AND ? THEN i.stock_in ELSE 0 END) AS stock_in,
                SUM(CASE WHEN i.transaction_date BETWEEN ? AND ? THEN i.stock_out ELSE 0 END) AS stock_out,
                SUM(CASE WHEN i.transaction_date <= ? THEN i.stock_in - i.stock_out ELSE 0 END) AS closing_stock,
                MIN(i.id) AS first_id',
                [$start, $start, $end, $start, $end, $end]
            )
            ->addSelect(
                'i.product_id', 'i.barcode', 'p.name as product_name', 'p.part_number',
                'c.name as category_name', 'br.name as brand_name', 'b.purchase_price'
            )
            ->groupBy('i.product_id', 'i.barcode', 'p.name', 'p.part_number', 'c.name', 'br.name', 'b.purchase_price');

        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('i.company_id', Auth::user()->company_id);
        }

        $query
            ->when($filters['company_id'] ?? null, fn($q, $v) => $q->where('i.company_id', $v))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('i.store_id', $v))
            ->when($filters['location_id'] ?? null, fn($q, $v) => $q->where('i.location_id', $v))
            ->when($filters['category_id'] ?? null, fn($q, $v) => $q->where('p.product_category_id', $v))
            ->when($filters['brand_id'] ?? null, fn($q, $v) => $q->where('p.brand_id', $v))
            ->when($filters['product_id'] ?? null, fn($q, $v) => $q->where('i.product_id', $v))
            ->when($filters['barcode'] ?? null, fn($q, $v) => $q->where('i.barcode', $v));

        if (($filters['show'] ?? 'current') === 'current') {
            $query->havingRaw('(stock_in <> 0 OR stock_out <> 0)');
        } else {
            $query->havingRaw('(opening_stock > 0 OR stock_in > 0 OR stock_out > 0 OR closing_stock > 0)');
        }

        $rows = $query->orderBy('first_id')->get()->map(function ($row) {
            $row->opening_stock = (float) $row->opening_stock;
            $row->stock_in = (float) $row->stock_in;
            $row->stock_out = (float) $row->stock_out;
            $row->closing_stock = (float) $row->closing_stock;
            $row->purchase_price = (float) $row->purchase_price;
            $row->total_amount = round($row->closing_stock * $row->purchase_price, 2);
            unset($row->first_id);
            return $row;
        });

        return [
            'rows' => $rows,
            'company' => $this->company($filters['company_id'] ?? null),
            'store' => !empty($filters['store_id']) ? DB::table('stores')->where('id', $filters['store_id'])->value('name') : null,
            'location' => !empty($filters['location_id']) ? DB::table('locations')->where('id', $filters['location_id'])->value('name') : null,
        ];
    }

    // product picker of the report search form: name or part number
    public function searchProducts(string $term)
    {
        $query = DB::table('products')
            ->whereNull('deleted_at')
            ->where(fn($q) => $q->where('name', 'like', "%{$term}%")->orWhere('part_number', 'like', "%{$term}%"))
            ->select('id', 'name', 'part_number');

        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('company_id', Auth::user()->company_id);
        }

        return $query->orderBy('name')->limit(20)->get();
    }

    // the report header: the picked company, else the user's own company
    private function company($companyId)
    {
        $companyId = $companyId ?: Auth::user()?->company_id;
        return $companyId ? DB::table('companies')->where('id', $companyId)->select('name', 'address', 'phone', 'logo')->first() : null;
    }
}
