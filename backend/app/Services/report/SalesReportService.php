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

    // Sales Summary Report (parts_bazar sellItems/salesSummaryReport): one row per approved bill
    // with the money received against it and the balance due
    public function salesSummary(array $filters): array
    {
        $received = DB::table('money_receipts')
            ->whereNull('deleted_at')
            ->whereNotNull('sale_id')
            ->selectRaw('sale_id, SUM(amount) AS received_amount')
            ->groupBy('sale_id');

        $query = DB::table('sales as s')
            ->join('customers as c', 'c.id', '=', 's.customer_id')
            ->leftJoin('lookups as ct', 'ct.id', '=', 'c.customer_type_id')
            ->leftJoin('companies as com', 'com.id', '=', 's.company_id')
            ->leftJoinSub($received, 'mr', 'mr.sale_id', '=', 's.id')
            ->whereNull('s.deleted_at')
            ->where('s.status', Sale::APPROVED)
            ->whereBetween('s.order_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                's.id', 's.so_no', 's.order_date', 's.grand_total', 'c.name as customer_name',
                'ct.name as customer_type', 'com.name as company_name',
                DB::raw('COALESCE(mr.received_amount, 0) AS received_amount')
            );

        if ($companyId = $this->ownCompanyId()) {
            $query->where('s.company_id', $companyId);
        }

        // 1 = paid (received the full bill), 0 = due
        $paid = $filters['paid'] ?? null;
        $rows = $query
            ->when($filters['company_id'] ?? null, fn($q, $v) => $q->where('s.company_id', $v))
            ->when($filters['customer_type_id'] ?? null, fn($q, $v) => $q->where('c.customer_type_id', $v))
            ->when($filters['customer_id'] ?? null, fn($q, $v) => $q->where('s.customer_id', $v))
            ->when($paid !== null, fn($q) => $paid
                ? $q->whereRaw('COALESCE(mr.received_amount, 0) >= s.grand_total')
                : $q->whereRaw('COALESCE(mr.received_amount, 0) < s.grand_total'))
            ->orderBy('s.order_date')
            ->orderBy('s.id')
            ->get()
            ->map(function ($row) {
                $row->grand_total = (float) $row->grand_total;
                $row->received_amount = (float) $row->received_amount;
                $row->due_amount = round($row->grand_total - $row->received_amount, 2);
                $row->paid = $row->due_amount <= 0;
                return $row;
            });

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => array_filter([
                'Company' => $this->name('companies', $filters['company_id'] ?? null),
                'Customer Type' => $this->name('lookups', $filters['customer_type_id'] ?? null),
                'Customer' => $this->name('customers', $filters['customer_id'] ?? null),
                'Order Status' => $paid === null ? null : ($paid ? 'Paid' : 'Due'),
            ]),
        ];
    }

    // Sales Return Report (parts_bazar sellReturn/sellReturnReport): every returned line between the dates
    // next to the sale line it came from
    public function salesReturn(array $filters): array
    {
        $query = DB::table('sale_return_details as rd')
            ->join('sale_returns as r', 'r.id', '=', 'rd.sale_return_id')
            ->join('sale_details as d', 'd.id', '=', 'rd.sale_detail_id')
            ->join('sales as s', 's.id', '=', 'r.sale_id')
            ->join('products as p', 'p.id', '=', 'rd.product_id')
            ->leftJoin('customers as c', 'c.id', '=', 'r.customer_id')
            ->whereNull('rd.deleted_at')
            ->whereNull('r.deleted_at')
            ->whereBetween('r.return_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'rd.id', 'r.id as return_id', 'r.return_no', 'r.return_date', 's.so_no', 'c.name as customer_name',
                'p.name as product_name', 'p.part_number', 'rd.barcode',
                'd.qty as sale_qty', 'd.sell_price', 'd.total_amount as sale_amount', 'rd.return_qty', 'rd.total_price as return_amount'
            );

        if ($companyId = $this->ownCompanyId()) {
            $query->where('r.company_id', $companyId);
        }

        $rows = $query
            ->when($filters['company_id'] ?? null, fn($q, $v) => $q->where('r.company_id', $v))
            ->when($filters['customer_id'] ?? null, fn($q, $v) => $q->where('r.customer_id', $v))
            ->when($filters['category_id'] ?? null, fn($q, $v) => $q->where('p.product_category_id', $v))
            ->when($filters['sub_category_id'] ?? null, fn($q, $v) => $q->where('p.sub_category_id', $v))
            ->when($filters['product_id'] ?? null, fn($q, $v) => $q->where('rd.product_id', $v))
            ->when($filters['barcode'] ?? null, fn($q, $v) => $q->where('rd.barcode', $v))
            ->orderBy('r.return_no')
            ->orderBy('rd.id')
            ->get()
            ->map(function ($row) {
                foreach (['sale_qty', 'sell_price', 'sale_amount', 'return_qty', 'return_amount'] as $field) {
                    $row->$field = (float) $row->$field;
                }
                return $row;
            });

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => array_filter([
                'Company' => $this->name('companies', $filters['company_id'] ?? null),
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
