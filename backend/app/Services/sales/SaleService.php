<?php

namespace App\Services\sales;

use App\Models\inventory\Inventory;
use App\Models\inventory\InventoryBarcode;
use App\Models\sales\Customer;
use App\Models\sales\MoneyReceipt;
use App\Models\sales\Sale;
use App\Models\sales\SaleDetail;
use App\Models\sales\SaleReturn;
use App\Models\softConfig\Lookup;
use App\Services\softConfig\ScrollCodeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Sales, same flow as parts_bazar sellItems:
// create SO (Pending) -> approve (stock out by barcode, money receipt for cash) -> locked
class SaleService
{
    const ENTRY_POINT = 'sale';

    public function __construct(private ScrollCodeService $scrollCodes)
    {
    }

    // Sales Manage: one row per sold barcode
    public function getSaleRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('sale_details as d')
            ->join('sales as s', 's.id', '=', 'd.sale_id')
            ->join('products as p', 'p.id', '=', 'd.product_id')
            ->leftJoin('brands as br', 'br.id', '=', 'p.brand_id')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->leftJoin('stores as st', 'st.id', '=', 'd.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'd.location_id')
            ->leftJoin('inventory_barcodes as b', 'b.barcode', '=', 'd.barcode')
            ->whereNull('d.deleted_at')
            ->whereNull('s.deleted_at')
            ->select(
                'd.id', 'd.sale_id', 'd.barcode', 'd.unit', 'd.qty', 'd.sell_price', 'd.discount', 'd.total_amount',
                's.so_no', 's.order_date', 's.cash_due', 's.memo_no', 's.grand_total', 's.received_amount', 's.due_amount', 's.status',
                'p.name as product_name', 'p.part_number', 'br.name as brand_name',
                'c.name as customer_name', 'c.phone as customer_phone', 'st.name as store_name', 'l.name as location_name',
                DB::raw('COALESCE(b.stock_in - b.stock_out, 0) as closing_stock')
            );

        $this->onlyOwnCompany($query, 's');

        $query
            ->when(($filters['status'] ?? '') !== '' ? $filters['status'] : null, fn($q, $v) => $q->where('s.status', $v))
            ->when($filters['cash_due'] ?? null, fn($q, $v) => $q->where('s.cash_due', $v))
            ->when($filters['so_no'] ?? null, fn($q, $v) => $q->where('s.so_no', 'like', "%{$v}%"))
            ->when($filters['customer_name'] ?? null, fn($q, $v) => $q->where(fn($w) => $w->where('c.name', 'like', "%{$v}%")->orWhere('c.phone', 'like', "%{$v}%")))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('d.store_id', $v))
            ->when($filters['location_name'] ?? null, fn($q, $v) => $q->where('l.name', 'like', "%{$v}%"))
            ->when($filters['product_name'] ?? null, fn($q, $v) => $q->where('p.name', 'like', "%{$v}%"))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('p.part_number', 'like', "%{$v}%"))
            ->when($filters['barcode'] ?? null, fn($q, $v) => $q->where('d.barcode', 'like', "%{$v}%"))
            ->when($filters['order_date'] ?? null, fn($q, $v) => $q->whereDate('s.order_date', $v));

        $rows = $query->orderByDesc('s.id')->orderBy('d.id')->paginate($perPage ?: 10);

        // parts_bazar shows "Approve" only when every item still has stock
        $pendingIds = collect($rows->items())->where('status', Sale::PENDING)->pluck('sale_id')->unique();
        $canApprove = $pendingIds->mapWithKeys(fn($id) => [$id => $this->hasStock(Sale::with('details')->find($id))]);
        foreach ($rows->items() as $row) {
            $row->can_approve = (bool) ($canApprove[$row->sale_id] ?? false);
        }

        return $rows;
    }

    public function getSale(int $id): Sale
    {
        return Sale::with([
            'details.product:id,name,part_number',
            'details.store:id,name',
            'details.location:id,name',
            'customer:id,name,phone,address,credit_limit',
            'company:id,name,address,phone,email',
            'createdBy:id,name',
            'approvedBy:id,name',
        ])->findOrFail($id);
    }

    // Dropdown lists for the sales form
    public function formOptions(): array
    {
        $lookup = fn(string $type) => Lookup::where('type', $type)->where('status', 1)->orderBy('id')
            ->get(['code', 'name'])
            ->map(fn($row) => ['value' => (string) $row->code, 'label' => $row->name]);

        return [
            'cash_due'      => $lookup('cash_due'),
            'received_type' => $lookup('payment_type'),
        ];
    }

    // Customer autocomplete: name or phone, with due limit and current due
    public function searchCustomers(string $term): array
    {
        return Customer::where('status', 1)
            ->where(fn($q) => $q->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%"))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'phone', 'car_name', 'credit_limit'])
            ->map(fn($customer) => [
                'id'        => $customer->id,
                'name'      => $customer->name,
                'phone'     => $customer->phone,
                'car_name'  => $customer->car_name,
                'due_limit' => (float) $customer->credit_limit,
                'due'       => $this->customerDue($customer->id),
            ])
            ->all();
    }

    // Barcode autocomplete (parts_bazar inventoryBarcode/itemByCode): stock left after pending SOs
    public function searchBarcodes(string $term, ?int $companyId = null, ?int $exceptSaleId = null): array
    {
        return InventoryBarcode::with('product.unit:id,name', 'store:id,name', 'location:id,name')
            ->where('barcode', 'like', "%{$term}%")
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->orderBy('barcode')
            ->limit(10)
            ->get()
            ->map(fn($row) => [
                'barcode'        => $row->barcode,
                'product_id'     => $row->product_id,
                'product_name'   => $row->product?->name,
                'part_number'    => $row->product?->part_number,
                'unit'           => $row->product?->unit?->name,
                'store_id'       => $row->store_id,
                'store_name'     => $row->store?->name,
                'location_id'    => $row->location_id,
                'location_name'  => $row->location?->name,
                'purchase_price' => (float) $row->purchase_price,
                'stock'          => $this->availableStock($row->barcode, $exceptSaleId),
            ])
            ->all();
    }

    // parts_bazar Customers::getTotalDueUpto: opening + approved sales + refunds - money received - returns
    public function customerDue(int $customerId): float
    {
        $customer = Customer::find($customerId);
        $opening = (float) $customer?->opening_balance;
        // opening type 1 = debit (they owe us), 2 = credit (we owe them)
        $opening = $customer?->opening_balance_type == '2' ? -$opening : $opening;

        $today = now()->toDateString();
        $sales = Sale::where('customer_id', $customerId)->where('status', Sale::APPROVED)
            ->whereDate('order_date', '<=', $today)->sum('grand_total');
        $received = MoneyReceipt::where('customer_id', $customerId)->whereDate('receipt_date', '<=', $today)
            // an Adjustment MR only moves old advance onto invoices, its amount was counted already
            ->sum(DB::raw("IF(received_type = '5', 0, amount) + discount + vds + tds"));
        $returns = SaleReturn::where('customer_id', $customerId)->whereDate('return_date', '<=', $today);
        $returned = (clone $returns)->sum('total_amount');
        $refunded = $returns->sum('refund_amount');

        return round($opening + $sales + $refunded - $received - $returned, 2);
    }

    public function createSale(array $data): Sale
    {
        // same customer, date and company saved in the last 30 seconds = double click
        $duplicate = Sale::where('customer_id', $data['customer_id'])
            ->whereDate('order_date', $data['order_date'])
            ->where('company_id', $data['company_id'])
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        return DB::transaction(function () use ($data) {
            $this->checkItems($data);

            $sale = Sale::create($this->headerData($data) + [
                'so_no'         => $this->scrollCodes->nextNumber('sales_invoice', $data['order_date']),
                'max_sl_no'     => (int) Sale::withTrashed()->max('max_sl_no') + 1,
                'company_sl_no' => (int) Sale::withTrashed()->where('company_id', $data['company_id'])->max('company_sl_no') + 1,
                'status'        => Sale::PENDING,
                'created_by'    => Auth::id(),
            ]);

            $this->saveDetails($sale, $data['items']);
            return $sale;
        });
    }

    public function updateSale(Sale $sale, array $data): Sale
    {
        $this->mustBePending($sale);

        return DB::transaction(function () use ($sale, $data) {
            $this->checkItems($data, $sale->id);
            $sale->update($this->headerData($data) + ['updated_by' => Auth::id()]);
            $sale->details()->forceDelete();
            $this->saveDetails($sale, $data['items']);
            return $sale;
        });
    }

    // parts_bazar deleteSo: only a pending SO
    public function deleteSale(Sale $sale): void
    {
        $this->mustBePending($sale);
        DB::transaction(function () use ($sale) {
            $sale->details()->delete();
            $sale->update(['deleted_by' => Auth::id()]);
            $sale->delete();
        });
    }

    // parts_bazar sellItems/delete: one item of a pending SO, the totals follow
    public function deleteSaleItem(SaleDetail $detail): void
    {
        $sale = $detail->sale;
        $this->mustBePending($sale);
        if ($sale->details()->count() <= 1) {
            throw new \RuntimeException('This is the last item, delete the whole SO instead.');
        }

        DB::transaction(function () use ($sale, $detail) {
            $detail->delete();
            $grandTotal = (float) $sale->details()->sum('total_amount');
            $received = min((float) $sale->received_amount, $grandTotal);
            $sale->update(['grand_total' => $grandTotal, 'received_amount' => $received, 'due_amount' => $grandTotal - $received]);
        });
    }

    public function approveSale(Sale $sale): void
    {
        $this->mustBePending($sale);

        DB::transaction(function () use ($sale) {
            $sale->load('details');
            $date = $sale->order_date;
            $previousDue = $this->customerDue($sale->customer_id); // before this SO, like parts_bazar

            foreach ($sale->details as $item) {
                if ($item->qty > InventoryBarcode::closingStock($item->barcode)) {
                    throw new \RuntimeException("Stock limit exceeded for barcode: {$item->barcode}");
                }

                Inventory::create([
                    'company_id'       => $sale->company_id,
                    'store_id'         => $item->store_id,
                    'location_id'      => $item->location_id,
                    'product_id'       => $item->product_id,
                    'stock_out'        => $item->qty,
                    'purchase_price'   => $item->purchase_price,
                    'sell_price'       => $item->sell_price,
                    'transaction_date' => $date,
                    'entry_point'      => self::ENTRY_POINT,
                    'entry_no'         => $sale->so_no,
                    'reference_id'     => $item->id,
                    'barcode'          => $item->barcode,
                    'created_by'       => Auth::id(),
                ]);
                InventoryBarcode::addStockOut($item->barcode, (float) $item->qty);
            }

            // money received with a cash sale
            if ($sale->cash_due == Sale::CASH && $sale->received_amount > 0) {
                MoneyReceipt::create([
                    'mr_no'         => $this->scrollCodes->nextNumber('money_receipt', $date),
                    'company_id'    => $sale->company_id,
                    'customer_id'   => $sale->customer_id,
                    'sale_id'       => $sale->id,
                    'order_no'      => $sale->so_no,
                    'receipt_date'  => $date,
                    'received_type' => $sale->received_type,
                    'lot_amount'    => $sale->received_amount,
                    'amount'        => $sale->received_amount,
                    'bill_amount'   => $sale->grand_total,
                    'created_by'    => Auth::id(),
                ]);
            }

            $sale->update([
                'previous_due' => $previousDue,
                'status'       => Sale::APPROVED,
                'approved_by'  => Auth::id(),
                'approved_at'  => now(),
            ]);
        });
    }

    // every item of the SO still has enough stock in its barcode
    public function hasStock(?Sale $sale): bool
    {
        if (!$sale) return false;
        foreach ($sale->details as $item) {
            if ($item->qty > InventoryBarcode::closingStock($item->barcode)) return false;
        }
        return true;
    }

    // stock of a barcode minus what pending SOs already hold
    private function availableStock(string $barcode, ?int $exceptSaleId = null): float
    {
        $pending = SaleDetail::where('barcode', $barcode)
            ->whereHas('sale', fn($q) => $q->where('status', Sale::PENDING)
                ->when($exceptSaleId, fn($w) => $w->where('id', '!=', $exceptSaleId)))
            ->sum('qty');

        return InventoryBarcode::closingStock($barcode) - (float) $pending;
    }

    // parts_bazar checks: stock of each barcode, due limit
    private function checkItems(array $data, ?int $saleId = null): void
    {
        foreach ($data['items'] as $item) {
            $barcode = InventoryBarcode::where('barcode', $item['barcode'])->first();
            if (!$barcode) {
                throw new \RuntimeException("Barcode {$item['barcode']} not found.");
            }
            if ($item['qty'] > $this->availableStock($item['barcode'], $saleId)) {
                throw new \RuntimeException("Quantity can not be grater than available stock (barcode {$item['barcode']}).");
            }
        }

        if ($data['cash_due'] == Sale::DUE && ($data['due_limit_exceed_accept'] ?? 1) == 2) {
            $customer = Customer::find($data['customer_id']);
            if ((float) $customer->credit_limit < $this->grandTotal($data['items'])) {
                throw new \RuntimeException('Sorry! Due Limit Exceed!');
            }
        }
    }

    private function headerData(array $data): array
    {
        $grandTotal = $this->grandTotal($data['items']);
        $received = $data['cash_due'] == Sale::CASH ? (float) ($data['received_amount'] ?? 0) : 0;

        return [
            'company_id'              => $data['company_id'],
            'order_date'              => $data['order_date'],
            'cash_due'                => $data['cash_due'],
            'memo_no'                 => $data['memo_no'] ?? null,
            'customer_id'             => $data['customer_id'],
            'mobile_no'               => $data['mobile_no'] ?? null,
            'car_name'                => $data['car_name'] ?? null,
            'car_no'                  => $data['car_no'] ?? null,
            'due_limit_exceed_accept' => $data['due_limit_exceed_accept'] ?? 1,
            'grand_total'             => $grandTotal,
            'received_type'           => $data['cash_due'] == Sale::CASH ? ($data['received_type'] ?? '1') : null,
            'received_amount'         => $received,
            'due_amount'              => max(0, $grandTotal - $received),
        ];
    }

    private function saveDetails(Sale $sale, array $items): void
    {
        foreach ($items as $item) {
            $barcode = InventoryBarcode::with('product.unit:id,name')->where('barcode', $item['barcode'])->first();
            SaleDetail::create([
                'sale_id'        => $sale->id,
                'store_id'       => $barcode->store_id,
                'location_id'    => $barcode->location_id,
                'product_id'     => $barcode->product_id,
                'barcode'        => $barcode->barcode,
                'unit'           => $barcode->product?->unit?->name,
                'qty'            => $item['qty'],
                'purchase_price' => $barcode->purchase_price,
                'sell_price'     => $item['sell_price'],
                'discount'       => 0,
                'total_amount'   => $this->lineTotal($item),
            ]);
        }
    }

    private function lineTotal(array $item): float
    {
        return round($item['qty'] * $item['sell_price'], 2);
    }

    private function grandTotal(array $items): float
    {
        return round(array_sum(array_map(fn($item) => $this->lineTotal($item), $items)), 2);
    }

    private function mustBePending(Sale $sale): void
    {
        if ($sale->status != Sale::PENDING) {
            throw new \RuntimeException("Sale {$sale->so_no} is approved and can not be changed.");
        }
    }

    private function onlyOwnCompany($query, string $alias): void
    {
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where("{$alias}.company_id", Auth::user()->company_id);
        }
    }
}
