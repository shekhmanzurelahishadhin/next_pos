<?php

namespace App\Services\report;

use App\Models\sales\MoneyReceipt;
use App\Models\sales\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

// Sales reports like parts_bazar sellItems/*Report
class SalesReportService
{
    public function __construct(private InventoryReportService $inventoryReports)
    {
    }

    // Sales Report (parts_bazar sellItems/sellReport)
    // Every line of the approved sales between the dates.
    public function sales(array $filters): array
    {
        $query = DB::table('sale_details')
            ->join('sales', 'sales.id', '=', 'sale_details.sale_id')
            ->join('products', 'products.id', '=', 'sale_details.product_id')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->whereNull('sale_details.deleted_at')
            ->whereNull('sales.deleted_at')
            ->where('sales.status', Sale::APPROVED)
            ->whereBetween('sales.order_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'sale_details.id',
                'sales.id as sale_id',
                'sales.so_no',
                'sales.order_date',
                'sales.grand_total',
                'customers.name as customer_name',
                'products.name as product_name',
                'products.part_number',
                'sale_details.barcode',
                'sale_details.qty',
                'sale_details.sell_price',
                'sale_details.discount',
                'sale_details.total_amount'
            );

        // a company user can only see the sales of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('sales.company_id', $ownCompanyId);
        }

        if (!empty($filters['customer_id'])) {
            $query->where('sales.customer_id', $filters['customer_id']);
        }
        if (!empty($filters['category_id'])) {
            $query->where('products.product_category_id', $filters['category_id']);
        }
        if (!empty($filters['sub_category_id'])) {
            $query->where('products.sub_category_id', $filters['sub_category_id']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('sale_details.product_id', $filters['product_id']);
        }
        if (!empty($filters['barcode'])) {
            $query->where('sale_details.barcode', $filters['barcode']);
        }

        $records = $query->orderBy('sales.so_no')->orderBy('sale_details.id')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->grand_total = (float) $record->grand_total;
            $record->qty = (float) $record->qty;
            $record->sell_price = (float) $record->sell_price;
            $record->discount = (float) $record->discount;
            $record->total_amount = (float) $record->total_amount;
            $rows[] = $record;
        }

        // names of the picked filters for the report header, like parts_bazar "Category: G"
        $labels = [];
        if (!empty($filters['customer_id'])) {
            $labels['Customer'] = $this->name('customers', $filters['customer_id']);
        }
        if (!empty($filters['category_id'])) {
            $labels['Category'] = $this->name('categories', $filters['category_id']);
        }
        if (!empty($filters['sub_category_id'])) {
            $labels['Sub-Category'] = $this->name('sub_categories', $filters['sub_category_id']);
        }
        if (!empty($filters['product_id'])) {
            $labels['Item'] = $this->name('products', $filters['product_id']);
        }
        if (!empty($filters['barcode'])) {
            $labels['Barcode'] = $filters['barcode'];
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company(),
            'labels' => $labels,
        ];
    }

    // Sales Summary Report (parts_bazar sellItems/salesSummaryReport)
    // One row per approved bill with the money received against it and the balance due.
    public function salesSummary(array $filters): array
    {
        // money received against each bill
        $receivedBySale = DB::table('money_receipts')
            ->whereNull('deleted_at')
            ->whereNotNull('sale_id')
            ->select('sale_id')
            ->selectRaw('SUM(amount) AS received_amount')
            ->groupBy('sale_id');

        $query = DB::table('sales')
            ->join('customers', 'customers.id', '=', 'sales.customer_id')
            ->leftJoin('lookups as customer_types', 'customer_types.id', '=', 'customers.customer_type_id')
            ->leftJoin('companies', 'companies.id', '=', 'sales.company_id')
            ->leftJoinSub($receivedBySale, 'received', 'received.sale_id', '=', 'sales.id')
            ->whereNull('sales.deleted_at')
            ->where('sales.status', Sale::APPROVED)
            ->whereBetween('sales.order_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'sales.id',
                'sales.so_no',
                'sales.order_date',
                'sales.grand_total',
                'customers.name as customer_name',
                'customer_types.name as customer_type',
                'companies.name as company_name'
            )
            ->selectRaw('COALESCE(received.received_amount, 0) AS received_amount');

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('sales.company_id', $ownCompanyId);
        }

        if (!empty($filters['company_id'])) {
            $query->where('sales.company_id', $filters['company_id']);
        }
        if (!empty($filters['customer_type_id'])) {
            $query->where('customers.customer_type_id', $filters['customer_type_id']);
        }
        if (!empty($filters['customer_id'])) {
            $query->where('sales.customer_id', $filters['customer_id']);
        }

        // paid: 1 = the full bill is received, 0 = some amount is still due
        $paid = $filters['paid'] ?? null;
        if ($paid === 1) {
            $query->whereRaw('COALESCE(received.received_amount, 0) >= sales.grand_total');
        }
        if ($paid === 0) {
            $query->whereRaw('COALESCE(received.received_amount, 0) < sales.grand_total');
        }

        $records = $query->orderBy('sales.order_date')->orderBy('sales.id')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->grand_total = (float) $record->grand_total;
            $record->received_amount = (float) $record->received_amount;
            $record->due_amount = round($record->grand_total - $record->received_amount, 2);
            $record->paid = $record->due_amount <= 0;
            $rows[] = $record;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }
        if (!empty($filters['customer_type_id'])) {
            $labels['Customer Type'] = $this->name('lookups', $filters['customer_type_id']);
        }
        if (!empty($filters['customer_id'])) {
            $labels['Customer'] = $this->name('customers', $filters['customer_id']);
        }
        if ($paid === 1) {
            $labels['Order Status'] = 'Paid';
        }
        if ($paid === 0) {
            $labels['Order Status'] = 'Due';
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $labels,
        ];
    }

    // Sales Return Report (parts_bazar sellReturn/sellReturnReport)
    // Every returned line between the dates, next to the sale line it came from.
    public function salesReturn(array $filters): array
    {
        $query = DB::table('sale_return_details')
            ->join('sale_returns', 'sale_returns.id', '=', 'sale_return_details.sale_return_id')
            ->join('sale_details', 'sale_details.id', '=', 'sale_return_details.sale_detail_id')
            ->join('sales', 'sales.id', '=', 'sale_returns.sale_id')
            ->join('products', 'products.id', '=', 'sale_return_details.product_id')
            ->leftJoin('customers', 'customers.id', '=', 'sale_returns.customer_id')
            ->whereNull('sale_return_details.deleted_at')
            ->whereNull('sale_returns.deleted_at')
            ->whereBetween('sale_returns.return_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'sale_return_details.id',
                'sale_returns.id as return_id',
                'sale_returns.return_no',
                'sale_returns.return_date',
                'sales.so_no',
                'customers.name as customer_name',
                'products.name as product_name',
                'products.part_number',
                'sale_return_details.barcode',
                'sale_details.qty as sale_qty',
                'sale_details.sell_price',
                'sale_details.total_amount as sale_amount',
                'sale_return_details.return_qty',
                'sale_return_details.total_price as return_amount'
            );

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('sale_returns.company_id', $ownCompanyId);
        }

        if (!empty($filters['company_id'])) {
            $query->where('sale_returns.company_id', $filters['company_id']);
        }
        if (!empty($filters['customer_id'])) {
            $query->where('sale_returns.customer_id', $filters['customer_id']);
        }
        if (!empty($filters['category_id'])) {
            $query->where('products.product_category_id', $filters['category_id']);
        }
        if (!empty($filters['sub_category_id'])) {
            $query->where('products.sub_category_id', $filters['sub_category_id']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('sale_return_details.product_id', $filters['product_id']);
        }
        if (!empty($filters['barcode'])) {
            $query->where('sale_return_details.barcode', $filters['barcode']);
        }

        $records = $query->orderBy('sale_returns.return_no')->orderBy('sale_return_details.id')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->sale_qty = (float) $record->sale_qty;
            $record->sell_price = (float) $record->sell_price;
            $record->sale_amount = (float) $record->sale_amount;
            $record->return_qty = (float) $record->return_qty;
            $record->return_amount = (float) $record->return_amount;
            $rows[] = $record;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }
        if (!empty($filters['customer_id'])) {
            $labels['Customer'] = $this->name('customers', $filters['customer_id']);
        }
        if (!empty($filters['category_id'])) {
            $labels['Category'] = $this->name('categories', $filters['category_id']);
        }
        if (!empty($filters['sub_category_id'])) {
            $labels['Sub-Category'] = $this->name('sub_categories', $filters['sub_category_id']);
        }
        if (!empty($filters['product_id'])) {
            $labels['Item'] = $this->name('products', $filters['product_id']);
        }
        if (!empty($filters['barcode'])) {
            $labels['Barcode'] = $filters['barcode'];
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $labels,
        ];
    }

    // Collection Report (parts_bazar moneyReceipt/collectionReport)
    // One row per money receipt (MR no) with the received amount, discount, VDS and TDS.
    // Adjustment MRs (old advance used on invoices) are left out, unless that type is picked.
    public function collection(array $filters): array
    {
        $query = $this->moneyReceiptQuery($filters);

        // one MR no has one line per invoice, so add up the lines of each MR
        $query->select('money_receipts.mr_no')
            ->selectRaw('MIN(money_receipts.receipt_date) AS receipt_date')
            ->selectRaw('MIN(money_receipts.received_type) AS received_type')
            ->selectRaw('MIN(money_receipts.bank_name) AS bank_name')
            ->selectRaw('MIN(customers.name) AS customer_name')
            ->selectRaw('SUM(money_receipts.amount) AS received_amount')
            ->selectRaw('SUM(money_receipts.discount) AS discount')
            ->selectRaw('SUM(money_receipts.vds) AS vds')
            ->selectRaw('SUM(money_receipts.tds) AS tds')
            ->selectRaw('MAX(money_receipts.id) AS last_id')
            ->groupBy('money_receipts.mr_no');

        if (empty($filters['received_type'])) {
            $query->where('money_receipts.received_type', '<>', MoneyReceipt::ADJUSTMENT);
        }

        // newest first
        $records = $query->orderByDesc('receipt_date')->orderByDesc('last_id')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->received_amount = (float) $record->received_amount;
            $record->discount = (float) $record->discount;
            $record->vds = (float) $record->vds;
            $record->tds = (float) $record->tds;
            $record->total_amount = round($record->received_amount + $record->discount + $record->vds + $record->tds, 2);
            unset($record->last_id);
            $rows[] = $record;
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $this->moneyReceiptLabels($filters),
        ];
    }

    // Invoice Wise Collection Report (parts_bazar moneyReceipt/invoiceWiseCollectionReport)
    // Every invoice line of the money receipts. The page merges the date, MR no, customer,
    // type and MR total over the lines of one MR.
    public function invoiceCollection(array $filters): array
    {
        // total of every MR no (all its lines)
        $mrTotals = DB::table('money_receipts')
            ->whereNull('deleted_at')
            ->select('mr_no')
            ->selectRaw('SUM(amount + discount + vds + tds) AS mr_total')
            ->groupBy('mr_no');

        $query = $this->moneyReceiptQuery($filters)
            ->leftJoin('sales', 'sales.id', '=', 'money_receipts.sale_id')
            ->joinSub($mrTotals, 'mr_totals', 'mr_totals.mr_no', '=', 'money_receipts.mr_no')
            ->select(
                'money_receipts.id',
                'money_receipts.mr_no',
                'money_receipts.receipt_date',
                'money_receipts.received_type',
                'money_receipts.order_no',
                'sales.memo_no',
                'customers.name as customer_name',
                'money_receipts.amount as received_amount',
                'money_receipts.discount',
                'money_receipts.vds',
                'money_receipts.tds',
                'mr_totals.mr_total'
            );

        $records = $query
            ->orderByDesc('money_receipts.receipt_date')
            ->orderByDesc('money_receipts.mr_no')
            ->orderBy('money_receipts.id')
            ->get();

        $rows = [];
        foreach ($records as $record) {
            $record->received_amount = (float) $record->received_amount;
            $record->discount = (float) $record->discount;
            $record->vds = (float) $record->vds;
            $record->tds = (float) $record->tds;
            $record->mr_total = (float) $record->mr_total;

            // opening balance and advance lines have no invoice no
            if ($record->order_no == MoneyReceipt::OPENING) {
                $record->invoice_no = 'Opening Balance';
            } elseif ($record->order_no == MoneyReceipt::ADVANCE) {
                $record->invoice_no = 'Advance';
            } else {
                $record->invoice_no = $record->order_no;
            }

            $rows[] = $record;
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $this->moneyReceiptLabels($filters),
        ];
    }

    // money receipts between the dates, with the filters of both collection reports
    private function moneyReceiptQuery(array $filters)
    {
        $query = DB::table('money_receipts')
            ->leftJoin('customers', 'customers.id', '=', 'money_receipts.customer_id')
            ->whereNull('money_receipts.deleted_at')
            ->whereBetween('money_receipts.receipt_date', [$filters['start_date'], $filters['end_date']]);

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('money_receipts.company_id', $ownCompanyId);
        }

        if (!empty($filters['received_type'])) {
            $query->where('money_receipts.received_type', $filters['received_type']);
        }
        if (!empty($filters['company_id'])) {
            $query->where('money_receipts.company_id', $filters['company_id']);
        }
        if (!empty($filters['bank_name'])) {
            $query->where('money_receipts.bank_name', $filters['bank_name']);
        }
        if (!empty($filters['customer_id'])) {
            $query->where('money_receipts.customer_id', $filters['customer_id']);
        }

        return $query;
    }

    private function moneyReceiptLabels(array $filters): array
    {
        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }
        if (!empty($filters['received_type'])) {
            $type = $filters['received_type'];
            $labels['Collection Type'] = MoneyReceipt::TYPE_NAMES[$type] ?? $type;
        }
        if (!empty($filters['bank_name'])) {
            $labels['Bank Name'] = $filters['bank_name'];
        }
        if (!empty($filters['customer_id'])) {
            $labels['Customer'] = $this->name('customers', $filters['customer_id']);
        }

        return $labels;
    }

    // Customer Due Report (parts_bazar sellItems/dueReport)
    // Every customer who owes money up to the date.
    // Due = opening balance + approved sales + refunds - money received - returns
    // (same as SaleService::customerDue).
    // Bill qty and due days come from the bills that are not fully paid;
    // due days are counted from the oldest of them.
    public function customerDue(array $filters): array
    {
        $endDate = $filters['end_date'];

        // total approved sales of each customer
        $salesByCustomer = DB::table('sales')
            ->whereNull('deleted_at')
            ->where('status', Sale::APPROVED)
            ->where('order_date', '<=', $endDate)
            ->select('customer_id')
            ->selectRaw('SUM(grand_total) AS amount')
            ->groupBy('customer_id');

        // total money received from each customer;
        // an Adjustment MR only moves old advance onto invoices, so its amount is not counted again
        $receivedByCustomer = DB::table('money_receipts')
            ->whereNull('deleted_at')
            ->where('receipt_date', '<=', $endDate)
            ->select('customer_id')
            ->selectRaw('SUM(IF(received_type = ?, 0, amount) + discount + vds + tds) AS amount', [MoneyReceipt::ADJUSTMENT])
            ->groupBy('customer_id');

        // total returned and refunded of each customer
        $returnsByCustomer = DB::table('sale_returns')
            ->whereNull('deleted_at')
            ->where('return_date', '<=', $endDate)
            ->select('customer_id')
            ->selectRaw('SUM(total_amount) AS returned')
            ->selectRaw('SUM(refund_amount) AS refunded')
            ->groupBy('customer_id');

        $query = DB::table('customers')
            ->leftJoinSub($salesByCustomer, 'sales_total', 'sales_total.customer_id', '=', 'customers.id')
            ->leftJoinSub($receivedByCustomer, 'received_total', 'received_total.customer_id', '=', 'customers.id')
            ->leftJoinSub($returnsByCustomer, 'returns_total', 'returns_total.customer_id', '=', 'customers.id')
            ->whereNull('customers.deleted_at')
            ->select('customers.id', 'customers.name as customer_name', 'customers.phone', 'customers.code')
            // opening balance type 2 means the customer paid in advance, so it is minus
            ->selectRaw("ROUND(
                IF(customers.opening_balance_type = '2', -1, 1) * COALESCE(customers.opening_balance, 0)
                + COALESCE(sales_total.amount, 0)
                + COALESCE(returns_total.refunded, 0)
                - COALESCE(received_total.amount, 0)
                - COALESCE(returns_total.returned, 0), 2) AS due_amount")
            ->having('due_amount', '>', 0);

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('customers.company_id', $ownCompanyId);
        }

        if (!empty($filters['company_id'])) {
            $query->where('customers.company_id', $filters['company_id']);
        }
        if (!empty($filters['customer_id'])) {
            $query->where('customers.id', $filters['customer_id']);
        }

        $customers = $query->orderByDesc('due_amount')->get();

        $customerIds = [];
        foreach ($customers as $customer) {
            $customerIds[] = $customer->id;
        }
        $unpaidBills = $this->unpaidBills($customerIds, $endDate);

        $rows = [];
        foreach ($customers as $customer) {
            $customer->due_amount = (float) $customer->due_amount;
            $customer->bill_qty = 0;
            $customer->due_days = 0;

            if (isset($unpaidBills[$customer->id])) {
                $billDates = $unpaidBills[$customer->id];
                $customer->bill_qty = count($billDates);
                $customer->due_days = (int) Carbon::parse(min($billDates))->diffInDays($endDate);
            }

            $rows[] = $customer;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }
        if (!empty($filters['customer_id'])) {
            $labels['Customer'] = $this->name('customers', $filters['customer_id']);
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $labels,
        ];
    }

    // Customer Ledger (parts_bazar customers/partyLedgerViewDateWise)
    // Shows every sale, return, refund and money receipt of one customer between the dates,
    // with a running balance that starts from the opening balance.
    public function customerLedger(array $filters): array
    {
        $startDate = $filters['start_date'];
        $endDate = $filters['end_date'];

        $customer = $this->findCustomer($filters['customer_id']);

        // the customer's own opening balance (type 2 means the customer paid in advance)
        $openingBalance = (float) $customer->opening_balance;
        if ($customer->opening_balance_type == '2') {
            $openingBalance = -$openingBalance;
        }

        $transactions = $this->customerTransactions($customer->id, $endDate);

        // transactions before the start date go into the opening balance,
        // the rest are the report rows
        $rows = [];
        $balance = $openingBalance;
        foreach ($transactions as $transaction) {
            if ($transaction['date'] < $startDate) {
                $openingBalance = $openingBalance + $transaction['debit'] - $transaction['credit'];
                $balance = $openingBalance;
                continue;
            }

            $balance = $balance + $transaction['debit'] - $transaction['credit'];
            $transaction['balance'] = round($balance, 2);
            $rows[] = $transaction;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }

        // the report header shows the picked company, or else the customer's company
        $companyId = $filters['company_id'] ?? $customer->company_id;

        return [
            'rows' => $rows,
            'opening' => round($openingBalance, 2),
            'customer' => $customer,
            'company' => $this->inventoryReports->company($companyId),
            'labels' => $labels,
        ];
    }

    private function findCustomer($customerId)
    {
        $query = DB::table('customers')
            ->whereNull('deleted_at')
            ->where('id', $customerId);

        // a company user can only see the customers of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('company_id', $ownCompanyId);
        }

        $customer = $query->first(['id', 'name', 'code', 'phone', 'address', 'company_id', 'opening_balance', 'opening_balance_type']);
        if (!$customer) {
            abort(404, 'Customer not found');
        }

        return $customer;
    }

    // All ledger lines of a customer up to the date, oldest first.
    // Debit increases what the customer owes, credit decreases it.
    private function customerTransactions($customerId, $endDate): array
    {
        $transactions = [];

        // 1. approved sales (debit)
        $sales = DB::table('sales')
            ->whereNull('deleted_at')
            ->where('status', Sale::APPROVED)
            ->where('customer_id', $customerId)
            ->where('order_date', '<=', $endDate)
            ->get();

        foreach ($sales as $sale) {
            $head = 'Sales Order No: ' . $sale->so_no;
            if ($sale->memo_no) {
                $head = $head . ', Memo No: ' . $sale->memo_no;
            }

            $transactions[] = [
                'id' => $sale->id,
                'date' => $sale->order_date,
                'sort' => 1,
                'type' => 'Sale',
                'head' => $head,
                'debit' => (float) $sale->grand_total,
                'credit' => 0,
            ];
        }

        // 2. sales returns (credit) and 3. the money refunded on a return (debit)
        $returns = DB::table('sale_returns')
            ->leftJoin('sales', 'sales.id', '=', 'sale_returns.sale_id')
            ->whereNull('sale_returns.deleted_at')
            ->where('sale_returns.customer_id', $customerId)
            ->where('sale_returns.return_date', '<=', $endDate)
            ->select('sale_returns.*', 'sales.so_no')
            ->get();

        foreach ($returns as $return) {
            $transactions[] = [
                'id' => $return->id,
                'date' => $return->return_date,
                'sort' => 2,
                'type' => 'Return',
                'head' => 'Sales Order No: ' . $return->so_no . ', Sales Return: ' . $return->return_no,
                'debit' => 0,
                'credit' => (float) $return->total_amount,
            ];

            if ($return->refund_amount > 0) {
                $transactions[] = [
                    'id' => $return->id,
                    'date' => $return->return_date,
                    'sort' => 3,
                    'type' => 'Refund',
                    'head' => 'Sales Order No: ' . $return->so_no . ', Sales Refund: ' . $return->return_no,
                    'debit' => (float) $return->refund_amount,
                    'credit' => 0,
                ];
            }
        }

        // 4. money receipts (credit), one line per MR no
        $receipts = DB::table('money_receipts')
            ->whereNull('deleted_at')
            ->where('customer_id', $customerId)
            ->where('receipt_date', '<=', $endDate)
            ->orderBy('id')
            ->get();

        $receiptLines = [];
        foreach ($receipts as $receipt) {
            // an Adjustment MR only moves old advance onto invoices, so its amount is not new money;
            // only its discount, VDS and TDS count (same as the Customer Due report)
            $amount = $receipt->amount;
            if ($receipt->received_type == MoneyReceipt::ADJUSTMENT) {
                $amount = 0;
            }
            $credit = $amount + $receipt->discount + $receipt->vds + $receipt->tds;

            $key = $receipt->mr_no . '|' . $receipt->receipt_date;
            if (!isset($receiptLines[$key])) {
                $receiptLines[$key] = [
                    'id' => $receipt->id,
                    'date' => $receipt->receipt_date,
                    'sort' => 4,
                    'type' => 'Receipt',
                    'head' => 'MR No: ' . $receipt->mr_no,
                    'debit' => 0,
                    'credit' => 0,
                ];
            }
            $receiptLines[$key]['credit'] += (float) $credit;
        }

        foreach ($receiptLines as $line) {
            if ($line['credit'] != 0) {
                $transactions[] = $line;
            }
        }

        // oldest first; on the same day: sales, returns, refunds, then receipts
        usort($transactions, function ($a, $b) {
            if ($a['date'] != $b['date']) {
                return strcmp($a['date'], $b['date']);
            }
            if ($a['sort'] != $b['sort']) {
                return $a['sort'] - $b['sort'];
            }
            return $a['id'] - $b['id'];
        });

        return $transactions;
    }

    // Approved bills up to the date that the money received and the returns do not cover yet.
    // Returns [customer id => [order date of each unpaid bill, ...]]
    private function unpaidBills(array $customerIds, string $endDate): array
    {
        if (count($customerIds) == 0) {
            return [];
        }

        // money received against each bill
        $paidBySale = DB::table('money_receipts')
            ->whereNull('deleted_at')
            ->whereNotNull('sale_id')
            ->select('sale_id')
            ->selectRaw('SUM(amount + discount + vds + tds) AS amount')
            ->groupBy('sale_id');

        // returned amount of each bill (the refunded part was paid back, so it is not counted)
        $returnedBySale = DB::table('sale_returns')
            ->whereNull('deleted_at')
            ->select('sale_id')
            ->selectRaw('SUM(total_amount - refund_amount) AS amount')
            ->groupBy('sale_id');

        $bills = DB::table('sales')
            ->leftJoinSub($paidBySale, 'paid', 'paid.sale_id', '=', 'sales.id')
            ->leftJoinSub($returnedBySale, 'returned', 'returned.sale_id', '=', 'sales.id')
            ->whereNull('sales.deleted_at')
            ->where('sales.status', Sale::APPROVED)
            ->where('sales.order_date', '<=', $endDate)
            ->whereIn('sales.customer_id', $customerIds)
            ->whereRaw('COALESCE(paid.amount, 0) + COALESCE(returned.amount, 0) < sales.grand_total')
            ->select('sales.customer_id', 'sales.order_date')
            ->get();

        $billDatesByCustomer = [];
        foreach ($bills as $bill) {
            $billDatesByCustomer[$bill->customer_id][] = $bill->order_date;
        }

        return $billDatesByCustomer;
    }

    // customer picker of the report search forms: search by name, phone or code
    public function searchCustomers(string $term)
    {
        $query = DB::table('customers')
            ->whereNull('deleted_at')
            ->where(function ($where) use ($term) {
                $where->where('name', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%");
            })
            ->select('id', 'name', 'phone', 'code');

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('company_id', $ownCompanyId);
        }

        return $query->orderBy('name')->limit(20)->get();
    }

    // name of a row, for the report header
    private function name(string $table, $id): ?string
    {
        if (!$id) {
            return null;
        }

        return DB::table($table)->where('id', $id)->value('name');
    }

    // company of the logged in user, null for a Super Admin
    private function ownCompanyId()
    {
        return $this->inventoryReports->ownCompanyId();
    }
}
