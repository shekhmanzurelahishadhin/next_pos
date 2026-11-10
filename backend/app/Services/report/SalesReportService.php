<?php

namespace App\Services\report;

use App\Models\sales\MoneyReceipt;
use App\Models\sales\Sale;
use Carbon\Carbon;
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

    // Collection Report (parts_bazar moneyReceipt/collectionReport): one row per money receipt (MR no)
    // with the received, discount, VDS and TDS; adjustments (old advance used) are left out unless asked
    public function collection(array $filters): array
    {
        $type = $filters['received_type'] ?? null;
        $rows = $this->receiptQuery($filters)
            ->selectRaw('
                m.mr_no, MIN(m.receipt_date) AS receipt_date, MIN(m.received_type) AS received_type, MIN(m.bank_name) AS bank_name,
                MIN(c.name) AS customer_name, SUM(m.amount) AS received_amount, SUM(m.discount) AS discount,
                SUM(m.vds) AS vds, SUM(m.tds) AS tds, MAX(m.id) AS last_id')
            ->groupBy('m.mr_no')
            ->when(!$type, fn($q) => $q->where('m.received_type', '<>', MoneyReceipt::ADJUSTMENT))
            ->orderByDesc('receipt_date')
            ->orderByDesc('last_id')
            ->get()
            ->map(function ($row) {
                foreach (['received_amount', 'discount', 'vds', 'tds'] as $field) {
                    $row->$field = (float) $row->$field;
                }
                $row->total_amount = round($row->received_amount + $row->discount + $row->vds + $row->tds, 2);
                unset($row->last_id);
                return $row;
            });

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $this->receiptLabels($filters),
        ];
    }

    // Invoice Wise Collection Report (parts_bazar moneyReceipt/invoiceWiseCollectionReport): every invoice line
    // of the money receipts; date, MR no, customer, type and the MR total are merged over the lines of one MR
    public function invoiceCollection(array $filters): array
    {
        $mrTotals = DB::table('money_receipts')
            ->whereNull('deleted_at')
            ->selectRaw('mr_no, SUM(amount + discount + vds + tds) AS mr_total')
            ->groupBy('mr_no');

        $rows = $this->receiptQuery($filters)
            ->leftJoin('sales as s', 's.id', '=', 'm.sale_id')
            ->joinSub($mrTotals, 'mt', 'mt.mr_no', '=', 'm.mr_no')
            ->select(
                'm.id', 'm.mr_no', 'm.receipt_date', 'm.received_type', 'm.order_no', 's.memo_no', 'c.name as customer_name',
                'm.amount as received_amount', 'm.discount', 'm.vds', 'm.tds', 'mt.mr_total'
            )
            ->orderByDesc('m.receipt_date')
            ->orderByDesc('m.mr_no')
            ->orderBy('m.id')
            ->get()
            ->map(function ($row) {
                foreach (['received_amount', 'discount', 'vds', 'tds', 'mr_total'] as $field) {
                    $row->$field = (float) $row->$field;
                }
                // opening balance and advance lines have no invoice
                $row->invoice_no = match ($row->order_no) {
                    MoneyReceipt::OPENING => 'Opening Balance',
                    MoneyReceipt::ADVANCE => 'Advance',
                    default => $row->order_no,
                };
                return $row;
            });

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $this->receiptLabels($filters),
        ];
    }

    // money receipts between the dates with the filters both collection reports have
    private function receiptQuery(array $filters)
    {
        $query = DB::table('money_receipts as m')
            ->leftJoin('customers as c', 'c.id', '=', 'm.customer_id')
            ->whereNull('m.deleted_at')
            ->whereBetween('m.receipt_date', [$filters['start_date'], $filters['end_date']]);

        if ($companyId = $this->ownCompanyId()) {
            $query->where('m.company_id', $companyId);
        }

        return $query
            ->when($filters['received_type'] ?? null, fn($q, $v) => $q->where('m.received_type', $v))
            ->when($filters['company_id'] ?? null, fn($q, $v) => $q->where('m.company_id', $v))
            ->when($filters['bank_name'] ?? null, fn($q, $v) => $q->where('m.bank_name', $v))
            ->when($filters['customer_id'] ?? null, fn($q, $v) => $q->where('m.customer_id', $v));
    }

    private function receiptLabels(array $filters): array
    {
        $type = $filters['received_type'] ?? null;
        return array_filter([
            'Company' => $this->name('companies', $filters['company_id'] ?? null),
            'Collection Type' => $type ? (MoneyReceipt::TYPE_NAMES[$type] ?? $type) : null,
            'Bank Name' => $filters['bank_name'] ?? null,
            'Customer' => $this->name('customers', $filters['customer_id'] ?? null),
        ]);
    }

    // Customer Due Report (parts_bazar sellItems/dueReport): every customer who owes money up to the date.
    // Due = opening + approved sales + refunds - money received - returns (same as SaleService::customerDue);
    // bill qty and due days come from the bills not fully paid, due days counted from the oldest one
    public function customerDue(array $filters): array
    {
        $upTo = $filters['end_date'];

        $sales = DB::table('sales')->whereNull('deleted_at')->where('status', Sale::APPROVED)->where('order_date', '<=', $upTo)
            ->selectRaw('customer_id, SUM(grand_total) AS amount')->groupBy('customer_id');
        // an Adjustment MR only moves old advance onto invoices, its amount was counted already
        $received = DB::table('money_receipts')->whereNull('deleted_at')->where('receipt_date', '<=', $upTo)
            ->selectRaw("customer_id, SUM(IF(received_type = ?, 0, amount) + discount + vds + tds) AS amount", [MoneyReceipt::ADJUSTMENT])
            ->groupBy('customer_id');
        $returns = DB::table('sale_returns')->whereNull('deleted_at')->where('return_date', '<=', $upTo)
            ->selectRaw('customer_id, SUM(total_amount) AS returned, SUM(refund_amount) AS refunded')->groupBy('customer_id');

        $query = DB::table('customers as c')
            ->leftJoinSub($sales, 'sa', 'sa.customer_id', '=', 'c.id')
            ->leftJoinSub($received, 'mr', 'mr.customer_id', '=', 'c.id')
            ->leftJoinSub($returns, 'rt', 'rt.customer_id', '=', 'c.id')
            ->whereNull('c.deleted_at')
            ->select('c.id', 'c.name as customer_name', 'c.phone', 'c.code')
            ->selectRaw("ROUND(IF(c.opening_balance_type = '2', -1, 1) * COALESCE(c.opening_balance, 0)
                + COALESCE(sa.amount, 0) + COALESCE(rt.refunded, 0) - COALESCE(mr.amount, 0) - COALESCE(rt.returned, 0), 2) AS due_amount")
            ->having('due_amount', '>', 0);

        if ($companyId = $this->ownCompanyId()) {
            $query->where('c.company_id', $companyId);
        }

        $rows = $query
            ->when($filters['company_id'] ?? null, fn($q, $v) => $q->where('c.company_id', $v))
            ->when($filters['customer_id'] ?? null, fn($q, $v) => $q->where('c.id', $v))
            ->orderByDesc('due_amount')
            ->get();

        $bills = $this->unpaidBills($rows->pluck('id')->all(), $upTo);
        $rows = $rows->map(function ($row) use ($bills, $upTo) {
            $own = $bills->get($row->id);
            $row->due_amount = (float) $row->due_amount;
            $row->bill_qty = $own ? count($own) : 0;
            $row->due_days = $own ? (int) Carbon::parse($own->min('order_date'))->diffInDays($upTo) : 0;
            return $row;
        });

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => array_filter([
                'Company' => $this->name('companies', $filters['company_id'] ?? null),
                'Customer' => $this->name('customers', $filters['customer_id'] ?? null),
            ]),
        ];
    }

    // approved bills up to the date that the money received and the returns do not cover yet, by customer
    private function unpaidBills(array $customerIds, string $upTo)
    {
        if (!$customerIds) {
            return collect();
        }

        $paid = DB::table('money_receipts')->whereNull('deleted_at')->whereNotNull('sale_id')
            ->selectRaw('sale_id, SUM(amount + discount + vds + tds) AS amount')->groupBy('sale_id');
        $returned = DB::table('sale_returns')->whereNull('deleted_at')
            ->selectRaw('sale_id, SUM(total_amount - refund_amount) AS amount')->groupBy('sale_id');

        return DB::table('sales as s')
            ->leftJoinSub($paid, 'p', 'p.sale_id', '=', 's.id')
            ->leftJoinSub($returned, 'r', 'r.sale_id', '=', 's.id')
            ->whereNull('s.deleted_at')
            ->where('s.status', Sale::APPROVED)
            ->where('s.order_date', '<=', $upTo)
            ->whereIn('s.customer_id', $customerIds)
            ->whereRaw('COALESCE(p.amount, 0) + COALESCE(r.amount, 0) < s.grand_total')
            ->select('s.customer_id', 's.order_date')
            ->get()
            ->groupBy('customer_id');
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
