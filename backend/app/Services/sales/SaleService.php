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

    // Sales Manage list: one row per sold barcode, newest SO first
    public function getSaleRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('sale_details')
            ->join('sales', 'sales.id', '=', 'sale_details.sale_id')
            ->join('products', 'products.id', '=', 'sale_details.product_id')
            ->leftJoin('brands', 'brands.id', '=', 'products.brand_id')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->leftJoin('stores', 'stores.id', '=', 'sale_details.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'sale_details.location_id')
            ->leftJoin('inventory_barcodes', 'inventory_barcodes.barcode', '=', 'sale_details.barcode')
            ->whereNull('sale_details.deleted_at')
            ->whereNull('sales.deleted_at')
            ->select(
                'sale_details.id',
                'sale_details.sale_id',
                'sale_details.barcode',
                'sale_details.unit',
                'sale_details.qty',
                'sale_details.sell_price',
                'sale_details.discount',
                'sale_details.total_amount',
                'sales.so_no',
                'sales.order_date',
                'sales.cash_due',
                'sales.memo_no',
                'sales.grand_total',
                'sales.received_amount',
                'sales.due_amount',
                'sales.status',
                'products.name as product_name',
                'products.part_number',
                'brands.name as brand_name',
                'customers.name as customer_name',
                'customers.phone as customer_phone',
                'stores.name as store_name',
                'locations.name as location_name',
                DB::raw('COALESCE(inventory_barcodes.stock_in - inventory_barcodes.stock_out, 0) as closing_stock')
            );

        // a company user can only see the sales of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('sales.company_id', $ownCompanyId);
        }

        // status 0 (Pending) is a real value, so only an empty status means "all"
        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('sales.status', $filters['status']);
        }
        if (!empty($filters['cash_due'])) {
            $query->where('sales.cash_due', $filters['cash_due']);
        }
        if (!empty($filters['so_no'])) {
            $query->where('sales.so_no', 'like', '%' . $filters['so_no'] . '%');
        }
        if (!empty($filters['customer_name'])) {
            // one box searches the customer name and phone
            $customer = $filters['customer_name'];
            $query->where(function ($where) use ($customer) {
                $where->where('customers.name', 'like', '%' . $customer . '%')
                    ->orWhere('customers.phone', 'like', '%' . $customer . '%');
            });
        }
        if (!empty($filters['store_id'])) {
            $query->where('sale_details.store_id', $filters['store_id']);
        }
        if (!empty($filters['location_name'])) {
            $query->where('locations.name', 'like', '%' . $filters['location_name'] . '%');
        }
        if (!empty($filters['product_name'])) {
            $query->where('products.name', 'like', '%' . $filters['product_name'] . '%');
        }
        if (!empty($filters['part_number'])) {
            $query->where('products.part_number', 'like', '%' . $filters['part_number'] . '%');
        }
        if (!empty($filters['barcode'])) {
            $query->where('sale_details.barcode', 'like', '%' . $filters['barcode'] . '%');
        }
        if (!empty($filters['order_date'])) {
            $query->whereDate('sales.order_date', $filters['order_date']);
        }

        if (!$perPage) {
            $perPage = 10;
        }
        $rows = $query->orderByDesc('sales.id')->orderBy('sale_details.id')->paginate($perPage);

        // parts_bazar shows "Approve" only when every item of a pending SO still has stock;
        // each pending SO is checked once
        $canApprove = [];
        foreach ($rows->items() as $row) {
            if ($row->status == Sale::PENDING && !isset($canApprove[$row->sale_id])) {
                $canApprove[$row->sale_id] = $this->hasStock(Sale::with('details')->find($row->sale_id));
            }
        }
        foreach ($rows->items() as $row) {
            $row->can_approve = !empty($canApprove[$row->sale_id]);
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
        return [
            'cash_due'      => $this->lookupOptions('cash_due'),
            'received_type' => $this->lookupOptions('payment_type'),
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

    // Customer autocomplete: name or phone, with due limit and current due
    public function searchCustomers(string $term): array
    {
        $customers = Customer::where('status', 1)
            ->where(function ($where) use ($term) {
                $where->where('name', 'like', '%' . $term . '%')->orWhere('phone', 'like', '%' . $term . '%');
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'phone', 'car_name', 'credit_limit']);

        $result = [];
        foreach ($customers as $customer) {
            $result[] = [
                'id'        => $customer->id,
                'name'      => $customer->name,
                'phone'     => $customer->phone,
                'car_name'  => $customer->car_name,
                'due_limit' => (float) $customer->credit_limit,
                'due'       => $this->customerDue($customer->id),
            ];
        }

        return $result;
    }

    // Barcode autocomplete (parts_bazar inventoryBarcode/itemByCode): stock left after pending SOs
    public function searchBarcodes(string $term, ?int $companyId = null, ?int $exceptSaleId = null): array
    {
        $query = InventoryBarcode::with('product.unit:id,name', 'store:id,name', 'location:id,name')
            ->where('barcode', 'like', '%' . $term . '%');
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        $barcodes = $query->orderBy('barcode')->limit(10)->get();

        $result = [];
        foreach ($barcodes as $barcode) {
            $productName = null;
            $partNumber = null;
            $unitName = null;
            if ($barcode->product) {
                $productName = $barcode->product->name;
                $partNumber = $barcode->product->part_number;
                if ($barcode->product->unit) {
                    $unitName = $barcode->product->unit->name;
                }
            }

            $storeName = null;
            if ($barcode->store) {
                $storeName = $barcode->store->name;
            }
            $locationName = null;
            if ($barcode->location) {
                $locationName = $barcode->location->name;
            }

            $result[] = [
                'barcode'        => $barcode->barcode,
                'product_id'     => $barcode->product_id,
                'product_name'   => $productName,
                'part_number'    => $partNumber,
                'unit'           => $unitName,
                'store_id'       => $barcode->store_id,
                'store_name'     => $storeName,
                'location_id'    => $barcode->location_id,
                'location_name'  => $locationName,
                'purchase_price' => (float) $barcode->purchase_price,
                'stock'          => $this->availableStock($barcode->barcode, $exceptSaleId),
            ];
        }

        return $result;
    }

    // What the customer owes up to today (parts_bazar Customers::getTotalDueUpto):
    // opening balance + approved sales + refunds - money received - returns
    public function customerDue(int $customerId): float
    {
        $today = now()->toDateString();

        // opening type 1 = debit (they owe us), 2 = credit (we owe them)
        $opening = 0;
        $customer = Customer::find($customerId);
        if ($customer) {
            $opening = (float) $customer->opening_balance;
            if ($customer->opening_balance_type == '2') {
                $opening = -$opening;
            }
        }

        $sold = Sale::where('customer_id', $customerId)
            ->where('status', Sale::APPROVED)
            ->whereDate('order_date', '<=', $today)
            ->sum('grand_total');

        // an Adjustment MR only moves old advance onto invoices, its amount was counted already
        $received = MoneyReceipt::where('customer_id', $customerId)
            ->whereDate('receipt_date', '<=', $today)
            ->sum(DB::raw("IF(received_type = '5', 0, amount) + discount + vds + tds"));

        // returned goods lower the due, money paid back to the customer brings it back
        $returned = SaleReturn::where('customer_id', $customerId)
            ->whereDate('return_date', '<=', $today)
            ->sum('total_amount');
        $refunded = SaleReturn::where('customer_id', $customerId)
            ->whereDate('return_date', '<=', $today)
            ->sum('refund_amount');

        return round($opening + $sold + $refunded - $received - $returned, 2);
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

        DB::beginTransaction();
        try {
            $this->checkItems($data);

            $saleData = $this->headerData($data);
            $saleData['so_no'] = $this->scrollCodes->nextNumber('sales_invoice', $data['order_date']);
            $saleData['max_sl_no'] = (int) Sale::withTrashed()->max('max_sl_no') + 1;
            $saleData['company_sl_no'] = (int) Sale::withTrashed()->where('company_id', $data['company_id'])->max('company_sl_no') + 1;
            $saleData['status'] = Sale::PENDING;
            $saleData['created_by'] = Auth::id();

            $sale = Sale::create($saleData);
            $this->saveDetails($sale, $data['items']);

            DB::commit();
            return $sale;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Only a pending sale can be changed
    public function updateSale(Sale $sale, array $data): Sale
    {
        $this->mustBePending($sale);

        DB::beginTransaction();
        try {
            $this->checkItems($data, $sale->id);

            $saleData = $this->headerData($data);
            $saleData['updated_by'] = Auth::id();
            $sale->update($saleData);

            // the items are saved again from the form
            $sale->details()->forceDelete();
            $this->saveDetails($sale, $data['items']);

            DB::commit();
            return $sale;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // parts_bazar deleteSo: only a pending SO
    public function deleteSale(Sale $sale): void
    {
        $this->mustBePending($sale);

        DB::beginTransaction();
        try {
            $sale->details()->delete();
            $sale->update(['deleted_by' => Auth::id()]);
            $sale->delete();
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // parts_bazar sellItems/delete: one item of a pending SO, the totals follow
    public function deleteSaleItem(SaleDetail $detail): void
    {
        $sale = $detail->sale;
        $this->mustBePending($sale);
        if ($sale->details()->count() <= 1) {
            throw new \RuntimeException('This is the last item, delete the whole SO instead.');
        }

        DB::beginTransaction();
        try {
            $detail->delete();

            // the received amount can not be more than the new total
            $grandTotal = (float) $sale->details()->sum('total_amount');
            $received = (float) $sale->received_amount;
            if ($received > $grandTotal) {
                $received = $grandTotal;
            }
            $sale->update([
                'grand_total'     => $grandTotal,
                'received_amount' => $received,
                'due_amount'      => $grandTotal - $received,
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Approve: stock goes out of each barcode, a cash sale gets its money receipt, the SO is locked
    public function approveSale(Sale $sale): void
    {
        $this->mustBePending($sale);

        DB::beginTransaction();
        try {
            $sale->load('details');
            // the due before this SO, like parts_bazar
            $previousDue = $this->customerDue($sale->customer_id);

            foreach ($sale->details as $item) {
                $this->stockOutItem($sale, $item);
            }

            // money received with a cash sale
            if ($sale->cash_due == Sale::CASH && $sale->received_amount > 0) {
                MoneyReceipt::create([
                    'mr_no'         => $this->scrollCodes->nextNumber('money_receipt', $sale->order_date),
                    'company_id'    => $sale->company_id,
                    'customer_id'   => $sale->customer_id,
                    'sale_id'       => $sale->id,
                    'order_no'      => $sale->so_no,
                    'receipt_date'  => $sale->order_date,
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

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // One approved item: a stock out row in the inventory and less stock in its barcode
    private function stockOutItem(Sale $sale, $item): void
    {
        if ($item->qty > InventoryBarcode::closingStock($item->barcode)) {
            throw new \RuntimeException('Stock limit exceeded for barcode: ' . $item->barcode);
        }

        Inventory::create([
            'company_id'       => $sale->company_id,
            'store_id'         => $item->store_id,
            'location_id'      => $item->location_id,
            'product_id'       => $item->product_id,
            'stock_out'        => $item->qty,
            'purchase_price'   => $item->purchase_price,
            'sell_price'       => $item->sell_price,
            'transaction_date' => $sale->order_date,
            'entry_point'      => self::ENTRY_POINT,
            'entry_no'         => $sale->so_no,
            'reference_id'     => $item->id,
            'barcode'          => $item->barcode,
            'created_by'       => Auth::id(),
        ]);
        InventoryBarcode::addStockOut($item->barcode, (float) $item->qty);
    }

    // every item of the SO still has enough stock in its barcode
    public function hasStock(?Sale $sale): bool
    {
        if (!$sale) {
            return false;
        }

        foreach ($sale->details as $item) {
            if ($item->qty > InventoryBarcode::closingStock($item->barcode)) {
                return false;
            }
        }
        return true;
    }

    // stock of a barcode minus what pending SOs already hold (the SO being edited is left out)
    private function availableStock(string $barcode, ?int $exceptSaleId = null): float
    {
        $pending = SaleDetail::where('barcode', $barcode)
            ->whereHas('sale', function ($saleQuery) use ($exceptSaleId) {
                $saleQuery->where('status', Sale::PENDING);
                if ($exceptSaleId) {
                    $saleQuery->where('id', '!=', $exceptSaleId);
                }
            })
            ->sum('qty');

        return InventoryBarcode::closingStock($barcode) - (float) $pending;
    }

    // parts_bazar checks: stock of each barcode, due limit
    private function checkItems(array $data, ?int $saleId = null): void
    {
        foreach ($data['items'] as $item) {
            $barcode = InventoryBarcode::where('barcode', $item['barcode'])->first();
            if (!$barcode) {
                throw new \RuntimeException('Barcode ' . $item['barcode'] . ' not found.');
            }
            if ($item['qty'] > $this->availableStock($item['barcode'], $saleId)) {
                throw new \RuntimeException('Quantity can not be grater than available stock (barcode ' . $item['barcode'] . ').');
            }
        }

        // a due sale can not go over the customer's due limit, unless "accept" was picked
        $dueLimitAccept = $data['due_limit_exceed_accept'] ?? 1;
        if ($data['cash_due'] == Sale::DUE && $dueLimitAccept == 2) {
            $customer = Customer::find($data['customer_id']);
            if ((float) $customer->credit_limit < $this->grandTotal($data['items'])) {
                throw new \RuntimeException('Sorry! Due Limit Exceed!');
            }
        }
    }

    // The sale fields from the form, with the totals worked out here
    private function headerData(array $data): array
    {
        $grandTotal = $this->grandTotal($data['items']);

        // only a cash sale has a received type and amount
        $receivedType = null;
        $received = 0;
        if ($data['cash_due'] == Sale::CASH) {
            $receivedType = $data['received_type'] ?? '1';
            $received = (float) ($data['received_amount'] ?? 0);
        }

        $due = $grandTotal - $received;
        if ($due < 0) {
            $due = 0;
        }

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
            'received_type'           => $receivedType,
            'received_amount'         => $received,
            'due_amount'              => $due,
        ];
    }

    // One sale detail per item; store, location, product and purchase price come from the barcode
    private function saveDetails(Sale $sale, array $items): void
    {
        foreach ($items as $item) {
            $barcode = InventoryBarcode::with('product.unit:id,name')->where('barcode', $item['barcode'])->first();

            $unitName = null;
            if ($barcode->product && $barcode->product->unit) {
                $unitName = $barcode->product->unit->name;
            }

            SaleDetail::create([
                'sale_id'        => $sale->id,
                'store_id'       => $barcode->store_id,
                'location_id'    => $barcode->location_id,
                'product_id'     => $barcode->product_id,
                'barcode'        => $barcode->barcode,
                'unit'           => $unitName,
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
        $total = 0;
        foreach ($items as $item) {
            $total += $this->lineTotal($item);
        }
        return round($total, 2);
    }

    private function mustBePending(Sale $sale): void
    {
        if ($sale->status != Sale::PENDING) {
            throw new \RuntimeException('Sale ' . $sale->so_no . ' is approved and can not be changed.');
        }
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
