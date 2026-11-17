<?php

namespace App\Services\report;

use App\Models\purchase\Purchase;
use App\Models\purchase\SupplierPayment;
use Illuminate\Support\Facades\DB;

// Purchase reports like parts_bazar purchaseItems/*Report
class PurchaseReportService
{
    public function __construct(private InventoryReportService $inventoryReports)
    {
    }

    // Purchase Report (parts_bazar purchaseItems/purchaseReport)
    // Every line of the approved purchases between the dates, with the weight cost.
    // The page merges the order no, date, supplier, store and grand total over the lines of one order.
    public function purchase(array $filters): array
    {
        // the barcode each purchase line got when it was received
        $barcodeByLine = DB::table('inventory_barcodes')
            ->where('entry_point', 'purchase')
            ->select('reference_id')
            ->selectRaw('MIN(barcode) AS barcode')
            ->groupBy('reference_id');

        $query = DB::table('purchase_details')
            ->join('purchases', 'purchases.id', '=', 'purchase_details.purchase_id')
            ->join('products', 'products.id', '=', 'purchase_details.product_id')
            ->leftJoin('units', 'units.id', '=', 'products.unit_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->leftJoin('stores', 'stores.id', '=', 'purchases.store_id')
            ->leftJoinSub($barcodeByLine, 'line_barcode', 'line_barcode.reference_id', '=', 'purchase_details.id')
            ->whereNull('purchase_details.deleted_at')
            ->whereNull('purchases.deleted_at')
            ->where('purchases.status', Purchase::APPROVED)
            ->whereBetween('purchases.purchase_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'purchase_details.id',
                'purchases.id as purchase_id',
                'purchases.po_no',
                'purchases.purchase_date',
                'purchases.grand_total',
                'suppliers.name as supplier_name',
                'stores.name as store_name',
                'products.name as product_name',
                'products.part_number',
                'units.name as unit_name',
                'line_barcode.barcode',
                'purchase_details.qty',
                'purchase_details.weight_unit',
                'purchase_details.total_weight',
                'purchase_details.per_kg',
                'purchase_details.total_weight_amount',
                'purchase_details.unit_price',
                'purchase_details.total_unit_price',
                'purchase_details.total_product_price',
                'purchase_details.total_purchase_price'
            );

        // a company user can only see the purchases of own company
        $ownCompanyId = $this->inventoryReports->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('purchases.company_id', $ownCompanyId);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('purchases.supplier_id', $filters['supplier_id']);
        }
        if (!empty($filters['category_id'])) {
            $query->where('products.product_category_id', $filters['category_id']);
        }
        if (!empty($filters['sub_category_id'])) {
            $query->where('products.sub_category_id', $filters['sub_category_id']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('purchase_details.product_id', $filters['product_id']);
        }
        if (!empty($filters['barcode'])) {
            $query->where('line_barcode.barcode', $filters['barcode']);
        }

        $records = $query->orderBy('purchases.po_no')->orderBy('purchase_details.id')->get();

        $numberFields = [
            'grand_total', 'qty', 'weight_unit', 'total_weight', 'per_kg', 'total_weight_amount',
            'unit_price', 'total_unit_price', 'total_product_price', 'total_purchase_price',
        ];
        $rows = [];
        foreach ($records as $record) {
            foreach ($numberFields as $field) {
                $record->$field = (float) $record->$field;
            }
            $rows[] = $record;
        }

        // names of the picked filters for the report header, like parts_bazar "Supplier: X"
        $labels = [];
        if (!empty($filters['supplier_id'])) {
            $labels['Supplier'] = $this->name('suppliers', $filters['supplier_id']);
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

    // Purchase Summary Report (parts_bazar purchaseItems/purchaseSummaryReport)
    // One row per approved purchase between the dates: order qty, total amount,
    // what was paid against it and the due.
    public function purchaseSummary(array $filters): array
    {
        // qty and amount of every purchase, from its lines like parts_bazar
        $linesByPurchase = DB::table('purchase_details')
            ->whereNull('deleted_at')
            ->select('purchase_id')
            ->selectRaw('SUM(qty) AS total_qty')
            ->selectRaw('SUM(total_purchase_price) AS total_amount')
            ->groupBy('purchase_id');

        // what was paid against every purchase
        $paidByPurchase = DB::table('supplier_payments')
            ->whereNull('deleted_at')
            ->whereNotNull('purchase_id')
            ->select('purchase_id')
            ->selectRaw('SUM(amount) AS paid_amount')
            ->groupBy('purchase_id');

        $query = DB::table('purchases')
            ->joinSub($linesByPurchase, 'lines', 'lines.purchase_id', '=', 'purchases.id')
            ->leftJoinSub($paidByPurchase, 'paid', 'paid.purchase_id', '=', 'purchases.id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->whereNull('purchases.deleted_at')
            ->where('purchases.status', Purchase::APPROVED)
            ->whereBetween('purchases.purchase_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'purchases.id',
                'purchases.purchase_date',
                'purchases.po_no',
                'purchases.supplier_bill_no',
                'suppliers.name as supplier_name',
                'lines.total_qty',
                'lines.total_amount',
                'paid.paid_amount'
            );

        // a company user can only see the purchases of own company
        $ownCompanyId = $this->inventoryReports->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('purchases.company_id', $ownCompanyId);
        }

        if (!empty($filters['company_id'])) {
            $query->where('purchases.company_id', $filters['company_id']);
        }
        if (!empty($filters['supplier_id'])) {
            $query->where('purchases.supplier_id', $filters['supplier_id']);
        }

        $records = $query->orderBy('purchases.po_no')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->total_qty = (float) $record->total_qty;
            $record->total_amount = (float) $record->total_amount;
            $record->paid_amount = (float) $record->paid_amount;
            $record->due_amount = $record->total_amount - $record->paid_amount;
            $rows[] = $record;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }
        if (!empty($filters['supplier_id'])) {
            $labels['Supplier'] = $this->name('suppliers', $filters['supplier_id']);
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($filters['company_id'] ?? null),
            'labels' => $labels,
        ];
    }

    // Purchase Return Report (parts_bazar purchaseReturn/purchaseReturnReport)
    // One row per product of every purchase return between the dates, with what was
    // purchased on that PO line. Unit price is the PO line amount / PO line qty, like parts_bazar.
    public function purchaseReturn(array $filters): array
    {
        $query = DB::table('purchase_return_details')
            ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_details.purchase_return_id')
            ->join('purchase_details', 'purchase_details.id', '=', 'purchase_return_details.purchase_detail_id')
            ->join('purchases', 'purchases.id', '=', 'purchase_returns.purchase_id')
            ->join('products', 'products.id', '=', 'purchase_return_details.product_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchase_returns.supplier_id')
            ->whereNull('purchase_return_details.deleted_at')
            ->whereNull('purchase_returns.deleted_at')
            ->whereBetween('purchase_returns.return_date', [$filters['start_date'], $filters['end_date']])
            ->select(
                'purchase_returns.id as return_id',
                'purchase_return_details.purchase_detail_id',
                'purchase_returns.return_no',
                'purchase_returns.return_date',
                'purchases.po_no',
                'suppliers.name as supplier_name',
                'products.part_number',
                'products.name as product_name',
                'purchase_details.qty as purchase_qty',
                'purchase_details.total_purchase_price as purchase_amount'
            )
            ->selectRaw("GROUP_CONCAT(DISTINCT purchase_return_details.barcode SEPARATOR ', ') AS barcode")
            ->selectRaw('SUM(purchase_return_details.return_qty) AS return_qty')
            ->selectRaw('SUM(purchase_return_details.total_price) AS return_amount')
            ->groupBy(
                'purchase_returns.id',
                'purchase_return_details.purchase_detail_id',
                'purchase_returns.return_no',
                'purchase_returns.return_date',
                'purchases.po_no',
                'suppliers.name',
                'products.part_number',
                'products.name',
                'purchase_details.qty',
                'purchase_details.total_purchase_price'
            );

        // a company user can only see the returns of own company
        $ownCompanyId = $this->inventoryReports->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('purchase_returns.company_id', $ownCompanyId);
        }

        if (!empty($filters['company_id'])) {
            $query->where('purchase_returns.company_id', $filters['company_id']);
        }
        if (!empty($filters['supplier_id'])) {
            $query->where('purchase_returns.supplier_id', $filters['supplier_id']);
        }
        if (!empty($filters['category_id'])) {
            $query->where('products.product_category_id', $filters['category_id']);
        }
        if (!empty($filters['sub_category_id'])) {
            $query->where('products.sub_category_id', $filters['sub_category_id']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('purchase_return_details.product_id', $filters['product_id']);
        }
        if (!empty($filters['barcode'])) {
            $query->where('purchase_return_details.barcode', $filters['barcode']);
        }

        $records = $query->orderBy('purchase_returns.return_no')->orderBy('purchase_return_details.purchase_detail_id')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->purchase_qty = (float) $record->purchase_qty;
            $record->purchase_amount = (float) $record->purchase_amount;
            $record->return_qty = (float) $record->return_qty;
            $record->return_amount = (float) $record->return_amount;

            $record->unit_price = 0;
            if ($record->purchase_qty > 0) {
                $record->unit_price = $record->purchase_amount / $record->purchase_qty;
            }
            $rows[] = $record;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
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
        if (!empty($filters['supplier_id'])) {
            $labels['Supplier'] = $this->name('suppliers', $filters['supplier_id']);
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

    // Payment Report (parts_bazar paymentReceipt/paymentReport)
    // One row per supplier payment (PR no) between the dates, newest first.
    // A PR has one line per PO it pays, so the lines of one PR are added up.
    // Barcodes are the barcodes received on the POs of the PR.
    public function payment(array $filters): array
    {
        // barcodes received on the POs of every PR no
        $barcodesByPr = DB::table('supplier_payments')
            ->join('inventory_barcodes', function ($join) {
                $join->on('inventory_barcodes.entry_no', '=', 'supplier_payments.po_no')
                    ->where('inventory_barcodes.entry_point', 'purchase');
            })
            ->whereNull('supplier_payments.deleted_at')
            ->select('supplier_payments.sl_no')
            ->selectRaw("GROUP_CONCAT(DISTINCT inventory_barcodes.barcode SEPARATOR ', ') AS barcode")
            ->groupBy('supplier_payments.sl_no');

        $query = DB::table('supplier_payments')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'supplier_payments.supplier_id')
            ->leftJoinSub($barcodesByPr, 'pr_barcodes', 'pr_barcodes.sl_no', '=', 'supplier_payments.sl_no')
            ->whereNull('supplier_payments.deleted_at')
            ->whereBetween('supplier_payments.payment_date', [$filters['start_date'], $filters['end_date']])
            ->select('supplier_payments.sl_no')
            ->selectRaw('MIN(supplier_payments.payment_date) AS payment_date')
            ->selectRaw('MIN(supplier_payments.payment_type) AS payment_type')
            ->selectRaw('MIN(supplier_payments.bank_name) AS bank_name')
            ->selectRaw('MIN(suppliers.name) AS supplier_name')
            ->selectRaw('MIN(pr_barcodes.barcode) AS barcode')
            ->selectRaw('SUM(supplier_payments.amount) AS payment_amount')
            ->selectRaw('SUM(supplier_payments.discount) AS discount')
            ->groupBy('supplier_payments.sl_no');

        // a company user can only see the payments of own company
        // (the advance line of a PR has no company, so the company of the PR is the one on its PO lines)
        $ownCompanyId = $this->inventoryReports->ownCompanyId();
        if ($ownCompanyId) {
            $query->havingRaw('MAX(supplier_payments.company_id) = ?', [$ownCompanyId]);
        }

        if (!empty($filters['company_id'])) {
            $query->havingRaw('MAX(supplier_payments.company_id) = ?', [$filters['company_id']]);
        }

        // no type picked: all types but Adjustment, which only moves old advance onto POs
        if (!empty($filters['payment_type'])) {
            if ($filters['payment_type'] == SupplierPayment::CASH) {
                $query->where(function ($where) {
                    $where->where('supplier_payments.payment_type', SupplierPayment::CASH)
                        ->orWhereNull('supplier_payments.payment_type');
                });
            } else {
                $query->where('supplier_payments.payment_type', $filters['payment_type']);
            }
        } else {
            $query->where(function ($where) {
                $where->where('supplier_payments.payment_type', '<>', SupplierPayment::ADJUSTMENT)
                    ->orWhereNull('supplier_payments.payment_type');
            });
        }

        if (!empty($filters['bank_name'])) {
            $query->where('supplier_payments.bank_name', $filters['bank_name']);
        }
        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_payments.supplier_id', $filters['supplier_id']);
        }

        // PRs that paid a PO which received this barcode
        if (!empty($filters['barcode'])) {
            $prsOfBarcode = DB::table('supplier_payments')
                ->join('inventory_barcodes', 'inventory_barcodes.entry_no', '=', 'supplier_payments.po_no')
                ->where('inventory_barcodes.entry_point', 'purchase')
                ->where('inventory_barcodes.barcode', $filters['barcode'])
                ->whereNull('supplier_payments.deleted_at')
                ->select('supplier_payments.sl_no');
            $query->whereIn('supplier_payments.sl_no', $prsOfBarcode);
        }

        // newest first
        $records = $query->orderByDesc('supplier_payments.sl_no')->get();

        $rows = [];
        foreach ($records as $record) {
            $record->payment_amount = (float) $record->payment_amount;
            $record->discount = (float) $record->discount;
            $record->total_amount = round($record->payment_amount + $record->discount, 2);
            $rows[] = $record;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }
        if (!empty($filters['payment_type'])) {
            $type = $filters['payment_type'];
            $labels['Payment Type'] = SupplierPayment::TYPE_NAMES[$type] ?? $type;
        }
        if (!empty($filters['bank_name'])) {
            $labels['Bank Name'] = $filters['bank_name'];
        }
        if (!empty($filters['supplier_id'])) {
            $labels['Supplier'] = $this->name('suppliers', $filters['supplier_id']);
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

    // Supplier Ledger (parts_bazar suppliers/partyLedgerViewDateWise)
    // Shows every purchase, return, refund and payment of one supplier between the dates,
    // with a running balance (what we owe the supplier) that starts from the opening balance.
    public function supplierLedger(array $filters): array
    {
        $startDate = $filters['start_date'];
        $endDate = $filters['end_date'];

        $supplier = DB::table('suppliers')
            ->whereNull('deleted_at')
            ->where('id', $filters['supplier_id'])
            ->first(['id', 'name', 'code', 'phone', 'address', 'opening_balance', 'opening_balance_type']);
        if (!$supplier) {
            abort(404, 'Supplier not found');
        }

        // the supplier's own opening balance (type 2 means we owe the supplier, type 1 means the supplier owes us)
        $openingBalance = (float) $supplier->opening_balance;
        if ($supplier->opening_balance_type != '2') {
            $openingBalance = -$openingBalance;
        }

        // a company user only sees the transactions of own company
        $companyId = null;
        if (!empty($filters['company_id'])) {
            $companyId = $filters['company_id'];
        }
        $ownCompanyId = $this->inventoryReports->ownCompanyId();
        if ($ownCompanyId) {
            $companyId = $ownCompanyId;
        }

        $transactions = $this->supplierTransactions($supplier->id, $endDate, $companyId);

        // transactions before the start date go into the opening balance,
        // the rest are the report rows
        $rows = [];
        $balance = $openingBalance;
        foreach ($transactions as $transaction) {
            if ($transaction['date'] < $startDate) {
                $openingBalance = $openingBalance + $transaction['credit'] - $transaction['debit'];
                $balance = $openingBalance;
                continue;
            }

            $balance = $balance + $transaction['credit'] - $transaction['debit'];
            $transaction['balance'] = round($balance, 2);
            $rows[] = $transaction;
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }

        unset($supplier->opening_balance, $supplier->opening_balance_type);

        return [
            'rows' => $rows,
            'opening' => round($openingBalance, 2),
            'supplier' => $supplier,
            'company' => $this->inventoryReports->company($companyId),
            'labels' => $labels,
        ];
    }

    // Supplier Ledger Summary (parts_bazar suppliers/partyLedgerSummaryViewDateWise)
    // One row per supplier: opening balance, debit and credit between the dates, closing balance.
    // Same amounts as the Supplier Ledger:
    //   credit = approved purchases + refunds
    //   debit  = returns + payments
    // Everything before the start date goes into the opening balance.
    // Suppliers with nothing to show (all four amounts 0) are left out.
    public function supplierLedgerSummary(array $filters): array
    {
        $startDate = $filters['start_date'];
        $endDate = $filters['end_date'];

        // a company user only sees the transactions of own company
        $companyId = null;
        if (!empty($filters['company_id'])) {
            $companyId = $filters['company_id'];
        }
        $ownCompanyId = $this->inventoryReports->ownCompanyId();
        if ($ownCompanyId) {
            $companyId = $ownCompanyId;
        }

        // approved purchases of each supplier, before the start date and between the dates
        $purchasesBySupplier = DB::table('purchases')
            ->whereNull('deleted_at')
            ->where('status', Purchase::APPROVED)
            ->where('purchase_date', '<=', $endDate)
            ->select('supplier_id')
            ->selectRaw('SUM(IF(purchase_date < ?, grand_total, 0)) AS before_start', [$startDate])
            ->selectRaw('SUM(IF(purchase_date < ?, 0, grand_total)) AS in_range', [$startDate])
            ->groupBy('supplier_id');
        if ($companyId) {
            $purchasesBySupplier->where('company_id', $companyId);
        }

        // returned and refunded amounts of each supplier
        $returnsBySupplier = DB::table('purchase_returns')
            ->whereNull('deleted_at')
            ->where('return_date', '<=', $endDate)
            ->select('supplier_id')
            ->selectRaw('SUM(IF(return_date < ?, total_amount, 0)) AS returned_before_start', [$startDate])
            ->selectRaw('SUM(IF(return_date < ?, 0, total_amount)) AS returned_in_range', [$startDate])
            ->selectRaw('SUM(IF(return_date < ?, refund_amount, 0)) AS refunded_before_start', [$startDate])
            ->selectRaw('SUM(IF(return_date < ?, 0, refund_amount)) AS refunded_in_range', [$startDate])
            ->groupBy('supplier_id');
        if ($companyId) {
            $returnsBySupplier->where('company_id', $companyId);
        }

        // money paid to each supplier;
        // an Adjustment payment only moves old advance onto POs, so only its discount counts
        $paidAmount = 'IF(payment_type = ' . SupplierPayment::ADJUSTMENT . ', 0, amount) + discount';
        $paymentsBySupplier = DB::table('supplier_payments')
            ->whereNull('deleted_at')
            ->where('payment_date', '<=', $endDate)
            ->select('supplier_id')
            ->selectRaw("SUM(IF(payment_date < ?, $paidAmount, 0)) AS before_start", [$startDate])
            ->selectRaw("SUM(IF(payment_date < ?, 0, $paidAmount)) AS in_range", [$startDate])
            ->groupBy('supplier_id');
        if ($companyId) {
            // the advance line of a PR has no company, so pick the PRs that have a line of this company
            $prsOfCompany = DB::table('supplier_payments')
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->select('sl_no');
            $paymentsBySupplier->whereIn('sl_no', $prsOfCompany);
        }

        $query = DB::table('suppliers')
            ->leftJoinSub($purchasesBySupplier, 'purchase_total', 'purchase_total.supplier_id', '=', 'suppliers.id')
            ->leftJoinSub($returnsBySupplier, 'returns_total', 'returns_total.supplier_id', '=', 'suppliers.id')
            ->leftJoinSub($paymentsBySupplier, 'paid_total', 'paid_total.supplier_id', '=', 'suppliers.id')
            ->whereNull('suppliers.deleted_at')
            ->select(
                'suppliers.id',
                'suppliers.name as supplier_name',
                'suppliers.opening_balance',
                'suppliers.opening_balance_type',
                'purchase_total.before_start as purchases_before_start',
                'purchase_total.in_range as purchases_in_range',
                'paid_total.before_start as paid_before_start',
                'paid_total.in_range as paid_in_range',
                'returns_total.returned_before_start',
                'returns_total.returned_in_range',
                'returns_total.refunded_before_start',
                'returns_total.refunded_in_range'
            );

        if (!empty($filters['supplier_id'])) {
            $query->where('suppliers.id', $filters['supplier_id']);
        }

        $suppliers = $query->orderBy('suppliers.name')->get();

        $rows = [];
        foreach ($suppliers as $supplier) {
            // the supplier's own opening balance (type 2 means we owe the supplier, type 1 means the supplier owes us)
            $opening = (float) $supplier->opening_balance;
            if ($supplier->opening_balance_type != '2') {
                $opening = -$opening;
            }

            $opening = $opening
                + (float) $supplier->purchases_before_start
                + (float) $supplier->refunded_before_start
                - (float) $supplier->returned_before_start
                - (float) $supplier->paid_before_start;

            $debit = (float) $supplier->returned_in_range + (float) $supplier->paid_in_range;
            $credit = (float) $supplier->purchases_in_range + (float) $supplier->refunded_in_range;
            $closing = $opening + $credit - $debit;

            $opening = round($opening, 2);
            $debit = round($debit, 2);
            $credit = round($credit, 2);
            $closing = round($closing, 2);

            if ($opening == 0 && $debit == 0 && $credit == 0 && $closing == 0) {
                continue;
            }

            $rows[] = [
                'id' => $supplier->id,
                'supplier_name' => $supplier->supplier_name,
                'opening' => $opening,
                'debit' => $debit,
                'credit' => $credit,
                'closing' => $closing,
            ];
        }

        $labels = [];
        if (!empty($filters['company_id'])) {
            $labels['Company'] = $this->name('companies', $filters['company_id']);
        }
        if (!empty($filters['supplier_id'])) {
            $labels['Supplier'] = $this->name('suppliers', $filters['supplier_id']);
        }

        return [
            'rows' => $rows,
            'company' => $this->inventoryReports->company($companyId),
            'labels' => $labels,
        ];
    }

    // All ledger lines of a supplier up to the date, oldest first.
    // Credit increases what we owe the supplier, debit decreases it.
    // $companyId: only the transactions of this company (null = all)
    private function supplierTransactions($supplierId, $endDate, $companyId): array
    {
        $transactions = [];

        // 1. approved purchases (credit)
        $purchases = DB::table('purchases')
            ->whereNull('deleted_at')
            ->where('status', Purchase::APPROVED)
            ->where('supplier_id', $supplierId)
            ->where('purchase_date', '<=', $endDate);
        if ($companyId) {
            $purchases->where('company_id', $companyId);
        }

        foreach ($purchases->get() as $purchase) {
            $transactions[] = [
                'id' => $purchase->id,
                'date' => $purchase->purchase_date,
                'sort' => 1,
                'type' => 'Purchase',
                'head' => 'Purchase Order No: ' . $purchase->po_no,
                'bill_no' => $purchase->supplier_bill_no,
                'debit' => 0,
                'credit' => (float) $purchase->grand_total,
            ];
        }

        // 2. purchase returns (debit) and 3. the money the supplier paid back on a return (credit)
        $returns = DB::table('purchase_returns')
            ->leftJoin('purchases', 'purchases.id', '=', 'purchase_returns.purchase_id')
            ->whereNull('purchase_returns.deleted_at')
            ->where('purchase_returns.supplier_id', $supplierId)
            ->where('purchase_returns.return_date', '<=', $endDate)
            ->select('purchase_returns.*', 'purchases.po_no');
        if ($companyId) {
            $returns->where('purchase_returns.company_id', $companyId);
        }

        foreach ($returns->get() as $return) {
            $transactions[] = [
                'id' => $return->id,
                'date' => $return->return_date,
                'sort' => 2,
                'type' => 'Return',
                'head' => 'Purchase Order No: ' . $return->po_no . ', Purchase Return: ' . $return->return_no,
                'bill_no' => null,
                'debit' => (float) $return->total_amount,
                'credit' => 0,
            ];

            if ($return->refund_amount > 0) {
                $transactions[] = [
                    'id' => $return->id,
                    'date' => $return->return_date,
                    'sort' => 3,
                    'type' => 'Refund',
                    'head' => 'Purchase Order No: ' . $return->po_no . ', Purchase Refund: ' . $return->return_no,
                    'bill_no' => null,
                    'debit' => 0,
                    'credit' => (float) $return->refund_amount,
                ];
            }
        }

        // 4. payments (debit), one line per PR no
        $payments = DB::table('supplier_payments')
            ->whereNull('deleted_at')
            ->where('supplier_id', $supplierId)
            ->where('payment_date', '<=', $endDate)
            ->orderBy('id');
        if ($companyId) {
            // the advance line of a PR has no company, so pick the PRs that have a line of this company
            $prsOfCompany = DB::table('supplier_payments')
                ->whereNull('deleted_at')
                ->where('supplier_id', $supplierId)
                ->where('company_id', $companyId)
                ->select('sl_no');
            $payments->whereIn('sl_no', $prsOfCompany);
        }

        $paymentLines = [];
        foreach ($payments->get() as $payment) {
            // an Adjustment payment only moves old advance onto POs, so its amount is not new money;
            // only its discount counts (same as the supplier due)
            $amount = $payment->amount;
            if ($payment->payment_type == SupplierPayment::ADJUSTMENT) {
                $amount = 0;
            }
            $debit = $amount + $payment->discount;

            $key = $payment->sl_no . '|' . $payment->payment_date;
            if (!isset($paymentLines[$key])) {
                $paymentLines[$key] = [
                    'id' => $payment->id,
                    'date' => $payment->payment_date,
                    'sort' => 4,
                    'type' => 'Payment',
                    'head' => 'Payment: ' . $payment->sl_no,
                    'bill_no' => $payment->supplier_mr_no,
                    'debit' => 0,
                    'credit' => 0,
                ];
            }
            $paymentLines[$key]['debit'] += (float) $debit;
        }

        foreach ($paymentLines as $line) {
            if ($line['debit'] != 0) {
                $transactions[] = $line;
            }
        }

        // oldest first; on the same day: purchases, returns, refunds, then payments
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

    // supplier picker of the report search forms: search by name, phone or code
    // (suppliers have no company, every company uses the same supplier list)
    public function searchSuppliers(string $term)
    {
        $query = DB::table('suppliers')
            ->whereNull('deleted_at')
            ->where(function ($where) use ($term) {
                $where->where('name', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%");
            })
            ->select('id', 'name', 'phone', 'code');

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
}
