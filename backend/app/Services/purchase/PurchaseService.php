<?php

namespace App\Services\purchase;

use App\Models\inventory\Inventory;
use App\Models\purchase\Purchase;
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
use Illuminate\Support\Str;

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
        $query = DB::table('purchase_details as d')
            ->join('purchases as p', 'p.id', '=', 'd.purchase_id')
            ->join('products as pr', 'pr.id', '=', 'd.product_id')
            ->leftJoin('suppliers as s', 's.id', '=', 'p.supplier_id')
            ->leftJoin('stores as st', 'st.id', '=', 'p.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'd.location_id')
            ->whereNull('d.deleted_at')
            ->whereNull('p.deleted_at')
            ->select(
                'd.id', 'd.purchase_id', 'd.qty', 'd.unit', 'd.unit_price', 'd.per_kg', 'd.sell_price',
                'd.total_product_price', 'd.total_weight_amount', 'd.total_purchase_price',
                'p.po_no', 'p.store_id', 'p.purchase_date', 'p.cash_due', 'p.purchase_type', 'p.supplier_bill_no',
                'p.grand_total', 'p.payment_amount', 'p.due_amount', 'p.status',
                'pr.name as product_name', 'pr.part_number',
                's.name as supplier_name', 'st.name as store_name', 'l.name as location_name'
            );

        // Restrict data if user is not superadmin and has a company_id
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('p.company_id', Auth::user()->company_id);
        }

        $query
            ->when(($filters['status'] ?? '') !== '' ? $filters['status'] : null, fn($q, $v) => $q->where('p.status', $v))
            ->when($filters['po_no'] ?? null, fn($q, $v) => $q->where('p.po_no', 'like', "%{$v}%"))
            ->when($filters['supplier_id'] ?? null, fn($q, $v) => $q->where('p.supplier_id', $v))
            ->when($filters['supplier_name'] ?? null, fn($q, $v) => $q->where('s.name', 'like', "%{$v}%"))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('p.store_id', $v))
            ->when($filters['cash_due'] ?? null, fn($q, $v) => $q->where('p.cash_due', $v))
            ->when($filters['purchase_type'] ?? null, fn($q, $v) => $q->where('p.purchase_type', $v))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('pr.part_number', 'like', "%{$v}%"))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('pr.name', 'like', "%{$v}%"))
            ->when($filters['purchase_date'] ?? null, fn($q, $v) => $q->whereDate('p.purchase_date', $v));

        return $query->orderByDesc('p.id')->orderBy('d.id')->paginate($perPage ?: 10);
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

    // Dropdown lists for the purchase form and the PO number it will get
    public function formOptions(): array
    {
        $lookup = fn(string $type) => Lookup::where('type', $type)->where('status', 1)->orderBy('id')
            ->get(['code', 'name'])
            ->map(fn($row) => ['value' => (string) $row->code, 'label' => $row->name]);

        return [
            'next_po_no'    => $this->scrollCodes->previewNumber('purchase_order'),
            'cash_due'      => $lookup('cash_due'),
            'purchase_type' => $lookup('local_import'),
            'payment_type'  => $lookup('payment_type'),
            'ship_by'       => $lookup('ship_by'),
        ];
    }

    // Part number autocomplete: product info with its latest purchase price, active sell price and stock
    public function searchProducts(string $term, ?int $storeId = null, ?int $locationId = null): array
    {
        return Product::with('unit:id,name')
            ->where('status', 1)
            ->where('part_number', 'like', "%{$term}%")
            ->orderBy('part_number')
            ->limit(50)
            ->get(['id', 'name', 'part_number', 'unit_id', 'unit_weight'])
            ->map(fn($product) => [
                'id'             => $product->id,
                'part_number'    => $product->part_number,
                'name'           => $product->name,
                'unit'           => $product->unit?->name,
                'weight'         => (float) $product->unit_weight,
                'purchase_price' => $this->activePurchasePrice($product->id),
                'sell_price'     => $this->activeSellPrice($product->id),
                'stock'          => Inventory::closingStock($product->id, $storeId, $locationId),
            ])
            ->all();
    }

    // Supplier autocomplete with what we still owe them
    public function searchSuppliers(string $term): array
    {
        return Supplier::where('status', 1)
            ->where(fn($q) => $q->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%"))
            ->orderBy('name')
            ->limit(30)
            ->get(['id', 'name', 'phone'])
            ->map(fn($supplier) => [
                'id'    => $supplier->id,
                'name'  => $supplier->name,
                'phone' => $supplier->phone,
                'due'   => $this->supplierDue($supplier->id),
            ])
            ->all();
    }

    // Opening balance + approved purchases - payments
    public function supplierDue(int $supplierId): float
    {
        $supplier = Supplier::find($supplierId);
        $opening = (float) $supplier?->opening_balance;
        // opening type 2 = credit (we owe them), 1 = debit (they owe us)
        $opening = $supplier?->opening_balance_type == '1' ? -$opening : $opening;

        $purchased = Purchase::where('supplier_id', $supplierId)->where('status', Purchase::APPROVED)->sum('grand_total');
        $paid = SupplierPayment::where('supplier_id', $supplierId)->sum('amount');

        return round($opening + $purchased - $paid, 2);
    }

    public function activePurchasePrice(int $productId): float
    {
        return (float) PurchasePrice::where('product_id', $productId)->orderByDesc('date')->orderByDesc('id')->value('price');
    }

    public function activeSellPrice(int $productId): float
    {
        return (float) SellPrice::where('product_id', $productId)->where('is_active', 1)->orderByDesc('id')->value('sell_price');
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

        return DB::transaction(function () use ($data) {
            $store = Store::findOrFail($data['store_id']);

            $purchase = Purchase::create($this->headerData($data) + [
                'po_no'         => $this->scrollCodes->nextNumber('purchase_order', $data['purchase_date']),
                'max_sl_no'     => (int) Purchase::withTrashed()->max('max_sl_no') + 1,
                'company_sl_no' => (int) Purchase::withTrashed()->where('company_id', $store->company_id)->max('company_sl_no') + 1,
                'company_id'    => $store->company_id,
                'status'        => Purchase::PENDING,
            ]);

            $this->saveDetails($purchase, $data['items']);
            $this->addHistory($purchase, Purchase::PENDING);

            return $purchase;
        });
    }

    // Only a pending purchase can be changed
    public function updatePurchase(Purchase $purchase, array $data): Purchase
    {
        $this->mustBePending($purchase);

        return DB::transaction(function () use ($purchase, $data) {
            $store = Store::findOrFail($data['store_id']);
            $purchase->update($this->headerData($data) + ['company_id' => $store->company_id]);

            $purchase->details()->forceDelete();
            $this->saveDetails($purchase, $data['items']);

            return $purchase;
        });
    }

    public function deletePurchase(Purchase $purchase): void
    {
        $this->mustBePending($purchase);

        DB::transaction(function () use ($purchase) {
            $purchase->details()->delete();
            $purchase->delete();
        });
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

        DB::transaction(function () use ($purchase) {
            $purchase->load('details');
            $date = $purchase->purchase_date;

            foreach ($purchase->details as $item) {
                // landed cost of one unit = unit price + weight cost
                $unitCost = round($item->unit_price + ($item->per_kg ?? 0) * ($item->weight_unit ?? 0), 2);

                Inventory::create([
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
                    'barcode'          => strtoupper(Str::random(10)),
                    'created_by'       => Auth::id(),
                ]);

                PurchasePrice::create([
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

            if ($purchase->cash_due == Purchase::CASH && $purchase->payment_amount > 0) {
                SupplierPayment::create([
                    'sl_no'        => $this->scrollCodes->nextNumber('supplier_payment', $date),
                    'company_id'   => $purchase->company_id,
                    'supplier_id'  => $purchase->supplier_id,
                    'purchase_id'  => $purchase->id,
                    'po_no'        => $purchase->po_no,
                    'payment_date' => $date,
                    'payment_type' => $purchase->payment_type,
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
        });
    }

    private function mustBePending(Purchase $purchase): void
    {
        if ($purchase->status != Purchase::PENDING) {
            throw new \RuntimeException('Purchase ' . $purchase->po_no . ' is ' . strtolower(Purchase::STATUS_NAMES[$purchase->status]) . ' and can not be changed.');
        }
    }

    // Header fields from the form; totals come from the items
    private function headerData(array $data): array
    {
        $grandTotal = round(collect($data['items'])->sum(fn($item) => $this->lineTotals($item)['total_purchase_price']), 2);
        $paid = $data['cash_due'] == Purchase::CASH ? (float) ($data['payment_amount'] ?? 0) : 0;

        if ($paid > $grandTotal) {
            throw new \RuntimeException('Paid amount must be lower or equal than grand total.');
        }

        return [
            'purchase_date'    => $data['purchase_date'],
            'cash_due'         => $data['cash_due'],
            'purchase_type'    => $data['purchase_type'],
            'store_id'         => $data['store_id'],
            'ship_by'          => $data['ship_by'] ?? null,
            'supplier_id'      => $data['supplier_id'],
            'payment_type'     => $paid > 0 ? ($data['payment_type'] ?? null) : null,
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

            $purchase->details()->create($this->lineTotals($item) + [
                'location_id' => $item['location_id'],
                'product_id'  => $product->id,
                'unit'        => $product->unit?->name,
                'qty'         => $item['qty'],
                'unit_price'  => $item['unit_price'],
                'per_kg'      => $item['per_kg'] ?? 0,
                'sell_price'  => $item['sell_price'] ?? 0,
                'weight_unit' => $item['weight_unit'] ?? 0,
                'created_by'  => Auth::id(),
            ]);
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

        return [
            'total_product_price'  => round($productPrice, 2),
            'total_weight'         => round($qty * $weightUnit, 2),
            'total_weight_amount'  => round($weightAmount, 2),
            'total_purchase_price' => round($total, 2),
            'total_unit_price'     => $qty > 0 ? round($total / $qty, 2) : 0,
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
}
