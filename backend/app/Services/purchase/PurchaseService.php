<?php

namespace App\Services\purchase;

use App\Models\inventory\Inventory;
use App\Models\inventory\InventoryBarcode;
use App\Models\purchase\Purchase;
use App\Models\purchase\PurchaseReturn;
use App\Models\purchase\PurchaseStatusHistory;
use App\Models\purchase\Supplier;
use App\Models\purchase\SupplierPayment;
use App\Models\sales\SellPrice;
use App\Models\softConfig\Lookup;
use App\Models\softConfig\Product;
use App\Models\softConfig\PurchasePrice;
use App\Models\softConfig\Store;
use App\Services\softConfig\ScrollCodeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Direct purchase, same flow as parts_bazar:
// create (Pending) -> approve (stock in, purchase price, sell price, supplier payment) -> locked
class PurchaseService
{
    public function __construct(private ScrollCodeService $scrollCodes)
    {
    }

    // Purchase Manage list: one row per purchased item, newest PO first
    public function getPurchaseRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('purchase_details')
            ->join('purchases', 'purchases.id', '=', 'purchase_details.purchase_id')
            ->join('products', 'products.id', '=', 'purchase_details.product_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->leftJoin('stores', 'stores.id', '=', 'purchases.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'purchase_details.location_id')
            ->whereNull('purchase_details.deleted_at')
            ->whereNull('purchases.deleted_at')
            ->select(
                'purchase_details.id',
                'purchase_details.purchase_id',
                'purchase_details.qty',
                'purchase_details.unit',
                'purchase_details.unit_price',
                'purchase_details.per_kg',
                'purchase_details.sell_price',
                'purchase_details.total_product_price',
                'purchase_details.total_weight_amount',
                'purchase_details.total_purchase_price',
                'purchases.po_no',
                'purchases.store_id',
                'purchases.purchase_date',
                'purchases.cash_due',
                'purchases.purchase_type',
                'purchases.supplier_bill_no',
                'purchases.grand_total',
                'purchases.payment_amount',
                'purchases.due_amount',
                'purchases.status',
                'products.name as product_name',
                'products.part_number',
                'suppliers.name as supplier_name',
                'stores.name as store_name',
                'locations.name as location_name'
            );

        // a company user can only see the purchases of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('purchases.company_id', $ownCompanyId);
        }

        // status 0 (Pending) is a real value, so only an empty status means "all"
        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('purchases.status', $filters['status']);
        }
        if (!empty($filters['po_no'])) {
            $query->where('purchases.po_no', 'like', '%' . $filters['po_no'] . '%');
        }
        if (!empty($filters['supplier_id'])) {
            $query->where('purchases.supplier_id', $filters['supplier_id']);
        }
        if (!empty($filters['supplier_name'])) {
            $query->where('suppliers.name', 'like', '%' . $filters['supplier_name'] . '%');
        }
        if (!empty($filters['store_id'])) {
            $query->where('purchases.store_id', $filters['store_id']);
        }
        if (!empty($filters['cash_due'])) {
            $query->where('purchases.cash_due', $filters['cash_due']);
        }
        if (!empty($filters['purchase_type'])) {
            $query->where('purchases.purchase_type', $filters['purchase_type']);
        }
        if (!empty($filters['part_number'])) {
            $query->where('products.part_number', 'like', '%' . $filters['part_number'] . '%');
        }
        if (!empty($filters['location_name'])) {
            $query->where('locations.name', 'like', '%' . $filters['location_name'] . '%');
        }
        if (!empty($filters['product_name'])) {
            $query->where('products.name', 'like', '%' . $filters['product_name'] . '%');
        }
        if (!empty($filters['purchase_date'])) {
            $query->whereDate('purchases.purchase_date', $filters['purchase_date']);
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('purchases.id')->orderBy('purchase_details.id')->paginate($perPage);
    }

    public function getPurchase(int $id): Purchase
    {
        return Purchase::with([
            'details.product:id,name,part_number',
            'details.location:id,name',
            'supplier:id,name,phone,address',
            'store:id,name,address',
            'company:id,name,address,phone,email',
            'createdBy:id,name',
            'approvedBy:id,name',
        ])->findOrFail($id);
    }

    // Dropdown lists for the purchase form
    public function formOptions(): array
    {
        return [
            'cash_due'      => $this->lookupOptions('cash_due'),
            'purchase_type' => $this->lookupOptions('local_import'),
            'payment_type'  => $this->lookupOptions('payment_type'),
            'ship_by'       => $this->lookupOptions('ship_by'),
        ];
    }

    // active lookups of one type as [value, label] options
    private function lookupOptions(string $type): array
    {
        $lookups = Lookup::where('type', $type)->where('status', 1)->orderBy('id')->get(['code', 'name']);

        $options = [];
        foreach ($lookups as $lookup) {
            $options[] = ['value' => (string) $lookup->code, 'label' => $lookup->name];
        }

        return $options;
    }

    // Part number autocomplete: product info with its latest purchase price, active sell price and stock
    public function searchProducts(string $term, ?int $storeId = null, ?int $locationId = null): array
    {
        $products = Product::with('unit:id,name')
            ->where('status', 1)
            ->where('part_number', 'like', '%' . $term . '%')
            ->orderBy('part_number')
            ->limit(50)
            ->get(['id', 'name', 'part_number', 'unit_id', 'unit_weight']);

        $result = [];
        foreach ($products as $product) {
            $unitName = null;
            if ($product->unit) {
                $unitName = $product->unit->name;
            }

            $result[] = [
                'id'             => $product->id,
                'part_number'    => $product->part_number,
                'name'           => $product->name,
                'unit'           => $unitName,
                'weight'         => (float) $product->unit_weight,
                'purchase_price' => $this->activePurchasePrice($product->id),
                'sell_price'     => $this->activeSellPrice($product->id),
                'stock'          => Inventory::closingStock($product->id, $storeId, $locationId),
            ];
        }

        return $result;
    }

    // Supplier autocomplete with what we still owe them
    public function searchSuppliers(string $term): array
    {
        $suppliers = Supplier::where('status', 1)
            ->where(function ($where) use ($term) {
                $where->where('name', 'like', '%' . $term . '%')->orWhere('phone', 'like', '%' . $term . '%');
            })
            ->orderBy('name')
            ->limit(30)
            ->get(['id', 'name', 'phone']);

        $result = [];
        foreach ($suppliers as $supplier) {
            $result[] = [
                'id'    => $supplier->id,
                'name'  => $supplier->name,
                'phone' => $supplier->phone,
                'due'   => $this->supplierDue($supplier->id),
            ];
        }

        return $result;
    }

    // What we owe the supplier up to today (like parts_bazar getTotalDueUpto()):
    // opening balance + approved purchases - payments - returns + refunds
    public function supplierDue(int $supplierId): float
    {
        $today = now()->toDateString();

        // opening type 2 = credit (we owe them), 1 = debit (they owe us)
        $opening = 0;
        $supplier = Supplier::find($supplierId);
        if ($supplier) {
            $opening = (float) $supplier->opening_balance;
            if ($supplier->opening_balance_type == '1') {
                $opening = -$opening;
            }
        }

        $purchased = Purchase::where('supplier_id', $supplierId)
            ->where('status', Purchase::APPROVED)
            ->whereDate('purchase_date', '<=', $today)
            ->sum('grand_total');

        // an Adjustment payment only moves old advance onto POs, its amount was counted already
        $paid = SupplierPayment::where('supplier_id', $supplierId)
            ->whereDate('payment_date', '<=', $today)
            ->sum(DB::raw("IF(payment_type = '5', 0, amount) + discount"));

        // returned goods lower the due, money the supplier refunded brings it back
        $returned = PurchaseReturn::where('supplier_id', $supplierId)
            ->whereDate('return_date', '<=', $today)
            ->sum('total_amount');
        $refunded = PurchaseReturn::where('supplier_id', $supplierId)
            ->whereDate('return_date', '<=', $today)
            ->where('is_refund', 1)
            ->sum('refund_amount');

        return round($opening + $purchased - $paid - $returned + $refunded, 2);
    }

    public function activePurchasePrice(int $productId): float
    {
        $price = PurchasePrice::where('product_id', $productId)->where('is_active', 1)->orderByDesc('id')->value('price');
        return (float) $price;
    }

    public function activeSellPrice(int $productId): float
    {
        $price = SellPrice::where('product_id', $productId)->where('is_active', 1)->orderByDesc('id')->value('sell_price');
        return (float) $price;
    }

    public function createPurchase(array $data): Purchase
    {
        // same supplier, date and store saved in the last 30 seconds = double click
        $duplicate = Purchase::where('supplier_id', $data['supplier_id'])
            ->whereDate('purchase_date', $data['purchase_date'])
            ->where('store_id', $data['store_id'])
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        DB::beginTransaction();
        try {
            $store = Store::findOrFail($data['store_id']);

            $purchaseData = $this->headerData($data);
            $purchaseData['po_no'] = $this->scrollCodes->nextNumber('purchase_order', $data['purchase_date']);
            $purchaseData['max_sl_no'] = (int) Purchase::withTrashed()->max('max_sl_no') + 1;
            $purchaseData['company_sl_no'] = (int) Purchase::withTrashed()->where('company_id', $store->company_id)->max('company_sl_no') + 1;
            $purchaseData['company_id'] = $store->company_id;
            $purchaseData['status'] = Purchase::PENDING;

            $purchase = Purchase::create($purchaseData);
            $this->saveDetails($purchase, $data['items']);
            $this->addHistory($purchase, Purchase::PENDING);

            DB::commit();
            return $purchase;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Only a pending purchase can be changed
    public function updatePurchase(Purchase $purchase, array $data): Purchase
    {
        $this->mustBePending($purchase);

        DB::beginTransaction();
        try {
            $store = Store::findOrFail($data['store_id']);

            $purchaseData = $this->headerData($data);
            $purchaseData['company_id'] = $store->company_id;
            $purchase->update($purchaseData);

            // the items are saved again from the form
            $purchase->details()->forceDelete();
            $this->saveDetails($purchase, $data['items']);

            DB::commit();
            return $purchase;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function deletePurchase(Purchase $purchase): void
    {
        // parts_bazar: only an approved PO is locked, a cancelled one can still be deleted
        if ($purchase->status == Purchase::APPROVED) {
            throw new \RuntimeException('Purchase ' . $purchase->po_no . ' is approved and can not be deleted.');
        }

        DB::beginTransaction();
        try {
            $purchase->details()->delete();
            $purchase->delete();
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function cancelPurchase(Purchase $purchase): void
    {
        $this->mustBePending($purchase);

        $purchase->update(['status' => Purchase::CANCELLED]);
        $this->addHistory($purchase, Purchase::CANCELLED);
    }

    public function undoCancelPurchase(Purchase $purchase): void
    {
        if ($purchase->status != Purchase::CANCELLED) {
            throw new \RuntimeException('This purchase is not cancelled.');
        }

        $purchase->update(['status' => Purchase::PENDING]);
        $this->addHistory($purchase, Purchase::PENDING);
    }

    // Receive the goods: stock in, save purchase / sell price, save the cash payment
    public function approvePurchase(Purchase $purchase): void
    {
        $this->mustBePending($purchase);

        DB::beginTransaction();
        try {
            $purchase->load('details');
            $date = $purchase->purchase_date;

            foreach ($purchase->details as $item) {
                $this->receiveItem($purchase, $item);
            }

            // a cash purchase pays the supplier at once
            if ($purchase->cash_due == Purchase::CASH && $purchase->payment_amount > 0) {
                SupplierPayment::create([
                    'sl_no'        => $this->scrollCodes->nextNumber('supplier_payment', $date),
                    'company_id'   => $purchase->company_id,
                    'supplier_id'  => $purchase->supplier_id,
                    'purchase_id'  => $purchase->id,
                    'po_no'        => $purchase->po_no,
                    'payment_date' => $date,
                    'payment_type' => $purchase->payment_type,
                    'lot_amount'   => $purchase->payment_amount,
                    'amount'       => $purchase->payment_amount,
                    'bill_amount'  => $purchase->grand_total,
                ]);
            }

            $purchase->update([
                'status'      => Purchase::APPROVED,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);
            $this->addHistory($purchase, Purchase::APPROVED);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // one item of an approved purchase: stock in with a new barcode, new purchase price and sell price
    private function receiveItem(Purchase $purchase, $item): void
    {
        $date = $purchase->purchase_date;

        // landed cost of one unit = unit price + weight cost
        $perKg = $item->per_kg ?? 0;
        $weightUnit = $item->weight_unit ?? 0;
        $unitCost = round($item->unit_price + $perKg * $weightUnit, 2);

        $stockRow = [
            'company_id'       => $purchase->company_id,
            'store_id'         => $purchase->store_id,
            'location_id'      => $item->location_id,
            'product_id'       => $item->product_id,
            'stock_in'         => $item->qty,
            'purchase_price'   => $unitCost,
            'sell_price'       => $item->sell_price,
            'transaction_date' => $date,
            'entry_point'      => 'purchase',
            'entry_no'         => $purchase->po_no,
            'reference_id'     => $item->id,
            'barcode'          => InventoryBarcode::newBarcode(),
        ];

        // one barcode row per received item, like parts_bazar inventory_barcode
        InventoryBarcode::create($stockRow);

        $stockRow['created_by'] = Auth::id();
        Inventory::create($stockRow);

        // the new purchase price becomes the active one
        PurchasePrice::where('product_id', $item->product_id)->update(['is_active' => 0]);
        PurchasePrice::create([
            'is_active'  => 1,
            'po_no'      => $purchase->po_no,
            'product_id' => $item->product_id,
            'price'      => $unitCost,
            'qty'        => $item->qty,
            'month'      => $date->month,
            'year'       => $date->year,
            'date'       => $date,
            'created_by' => Auth::id(),
        ]);

        // the sell price given on the purchase becomes the active one
        if ($item->sell_price > 0) {
            SellPrice::where('product_id', $item->product_id)->update(['is_active' => 0]);
            SellPrice::create([
                'product_id' => $item->product_id,
                'sell_price' => $item->sell_price,
                'start_date' => $date,
                'is_active'  => 1,
                'created_by' => Auth::id(),
            ]);
        }
    }

    private function mustBePending(Purchase $purchase): void
    {
        if ($purchase->status != Purchase::PENDING) {
            $statusName = strtolower(Purchase::STATUS_NAMES[$purchase->status]);
            throw new \RuntimeException('Purchase ' . $purchase->po_no . ' is ' . $statusName . ' and can not be changed.');
        }
    }

    // Header fields from the form; the totals come from the items
    private function headerData(array $data): array
    {
        $grandTotal = 0;
        foreach ($data['items'] as $item) {
            $lineTotals = $this->lineTotals($item);
            $grandTotal += $lineTotals['total_purchase_price'];
        }
        $grandTotal = round($grandTotal, 2);

        // only a cash purchase is paid now
        $paid = 0;
        if ($data['cash_due'] == Purchase::CASH) {
            $paid = (float) ($data['payment_amount'] ?? 0);
        }

        if ($paid > $grandTotal) {
            throw new \RuntimeException('Paid amount must be lower or equal than grand total.');
        }

        $paymentType = null;
        if ($paid > 0) {
            $paymentType = $data['payment_type'] ?? null;
        }

        return [
            'purchase_date'    => $data['purchase_date'],
            'cash_due'         => $data['cash_due'],
            'purchase_type'    => $data['purchase_type'],
            'store_id'         => $data['store_id'],
            'ship_by'          => $data['ship_by'] ?? null,
            'supplier_id'      => $data['supplier_id'],
            'payment_type'     => $paymentType,
            'payment_amount'   => $paid,
            'supplier_bill_no' => $data['supplier_bill_no'] ?? null,
            'grand_total'      => $grandTotal,
            'due_amount'       => round($grandTotal - $paid, 2),
            'full_paid'        => $paid >= $grandTotal ? 1 : 0,
        ];
    }

    private function saveDetails(Purchase $purchase, array $items): void
    {
        foreach ($items as $item) {
            $product = Product::with('unit:id,name')->findOrFail($item['product_id']);

            $unitName = null;
            if ($product->unit) {
                $unitName = $product->unit->name;
            }

            $detail = $this->lineTotals($item);
            $detail['location_id'] = $item['location_id'];
            $detail['product_id'] = $product->id;
            $detail['unit'] = $unitName;
            $detail['qty'] = $item['qty'];
            $detail['unit_price'] = $item['unit_price'];
            $detail['per_kg'] = $item['per_kg'] ?? 0;
            $detail['sell_price'] = $item['sell_price'] ?? 0;
            $detail['weight_unit'] = $item['weight_unit'] ?? 0;
            $detail['created_by'] = Auth::id();

            $purchase->details()->create($detail);
        }
    }

    // Same sums as the parts_bazar purchase grid
    private function lineTotals(array $item): array
    {
        $qty = (float) $item['qty'];
        $unitPrice = (float) $item['unit_price'];
        $perKg = (float) ($item['per_kg'] ?? 0);
        $weightUnit = (float) ($item['weight_unit'] ?? 0);

        $productPrice = $qty * $unitPrice;
        $weightAmount = $qty * $weightUnit * $perKg;
        $total = $productPrice + $weightAmount;

        $totalUnitPrice = 0;
        if ($qty > 0) {
            $totalUnitPrice = round($total / $qty, 2);
        }

        return [
            'total_product_price'  => round($productPrice, 2),
            'total_weight'         => round($qty * $weightUnit, 2),
            'total_weight_amount'  => round($weightAmount, 2),
            'total_purchase_price' => round($total, 2),
            'total_unit_price'     => $totalUnitPrice,
        ];
    }

    private function addHistory(Purchase $purchase, int $status): void
    {
        PurchaseStatusHistory::create([
            'purchase_id' => $purchase->id,
            'status'      => $status,
            'changed_by'  => Auth::id(),
        ]);
    }

    // company of the logged in user, null for a Super Admin (who can see every company)
    private function ownCompanyId()
    {
        $user = Auth::user();
        if (!$user || $user->hasRole('Super Admin') || empty($user->company_id)) {
            return null;
        }

        return $user->company_id;
    }
}
