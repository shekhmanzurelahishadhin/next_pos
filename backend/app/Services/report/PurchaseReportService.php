<?php

namespace App\Services\report;

use App\Models\purchase\Purchase;
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

    // supplier picker of the report search forms: search by name, phone or code
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

        $ownCompanyId = $this->inventoryReports->ownCompanyId();
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
}
