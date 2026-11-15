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
