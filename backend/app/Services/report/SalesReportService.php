<?php

namespace App\Services\report;

use App\Models\sales\Sale;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Sales reports like parts_bazar sellItems/*Report
class SalesReportService
{
    public function __construct(private InventoryReportService $inventoryReports)
    {
    }

    // Sales Report (parts_bazar sellItems/sellReport): every line of the approved sales between the dates
    public function sales(array $filters): array
    {
        $query = DB::table('sale_details as d')
            ->join('sales as s', 's.id', '=', 'd.sale_id')
            ->join('products as p', 'p.id', '=', 'd.product_id')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->whereNull('d.deleted_at')
            ->whereNull('s.deleted_at')
            ->where('s.status', Sale::APPROVED)
            ->whereBetween('s.order_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'd.id', 's.id as sale_id', 's.so_no', 's.order_date', 's.grand_total', 'c.name as customer_name',
                'p.name as product_name', 'p.part_number', 'd.barcode', 'd.qty', 'd.sell_price', 'd.discount', 'd.total_amount'
            );

        if ($companyId = $this->ownCompanyId()) {
            $query->where('s.company_id', $companyId);
        }

        $rows = $query
            ->when($filters['customer_id'] ?? null, fn($q, $v) => $q->where('s.customer_id', $v))
            ->when($filters['category_id'] ?? null, fn($q, $v) => $q->where('p.product_category_id', $v))
            ->when($filters['sub_category_id'] ?? null, fn($q, $v) => $q->where('p.sub_category_id', $v))
            ->when($filters['product_id'] ?? null, fn($q, $v) => $q->where('d.product_id', $v))
            ->when($filters['barcode'] ?? null, fn($q, $v) => $q->where('d.barcode', $v))
            ->orderBy('s.so_no')
            ->orderBy('d.id')
            ->get()
            ->map(function ($row) {
                foreach (['grand_total', 'qty', 'sell_price', 'discount', 'total_amount'] as $field) {
                    $row->$field = (float) $row->$field;
                }
                return $row;
            });

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company(),
            // names for the report header, like parts_bazar "Category: G"
            'labels' => array_filter([
                'Customer' => $this->name('customers', $filters['customer_id'] ?? null),
                'Category' => $this->name('categories', $filters['category_id'] ?? null),
                'Sub-Category' => $this->name('sub_categories', $filters['sub_category_id'] ?? null),
                'Item' => $this->name('products', $filters['product_id'] ?? null),
                'Barcode' => $filters['barcode'] ?? null,
            ]),
        ];
    }

    // customer picker of the report search forms
    public function searchCustomers(string $term)
    {
        $query = DB::table('customers')
            ->whereNull('deleted_at')
            ->where(fn($q) => $q->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%")->orWhere('code', 'like', "%{$term}%"))
            ->select('id', 'name', 'phone', 'code');

        if ($companyId = $this->ownCompanyId()) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('name')->limit(20)->get();
    }

    private function name(string $table, $id): ?string
    {
        return $id ? DB::table($table)->where('id', $id)->value('name') : null;
    }

    private function ownCompanyId()
    {
        $user = Auth::user();
        return $user && !$user->hasRole('Super Admin') && !empty($user->company_id) ? $user->company_id : null;
    }
}
