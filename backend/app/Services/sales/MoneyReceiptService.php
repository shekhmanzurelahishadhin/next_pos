<?php

namespace App\Services\sales;

use App\Models\sales\Customer;
use App\Models\sales\MoneyReceipt;
use App\Models\sales\Sale;
use App\Models\sales\SaleReturn;
use App\Models\softConfig\Lookup;
use App\Services\softConfig\ScrollCodeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Money receipt, same flow as parts_bazar moneyReceipt/addMoneyReceiptForm:
// pick a customer, give a lot amount, "Distribute" it over the due invoices (oldest first),
// what is left over is saved as an advance line. One MR no, one row per invoice.
class MoneyReceiptService
{
    const BANK_TYPES = ['2', '3']; // cheque, deposit into bank need a bank name

    public function __construct(private ScrollCodeService $scrollCodes, private SaleService $sales)
    {
    }

    // "Create Money Receipt" page: customers with their due
    public function getCustomerRows(array $filters = [], $perPage = 10)
    {
        $query = Customer::query()->select('id', 'name', 'phone', 'address', 'company_id');

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['phone'])) {
            $query->where('phone', 'like', '%' . $filters['phone'] . '%');
        }

        // a company user can only see the customers of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('company_id', $ownCompanyId);
        }

        if (!$perPage) {
            $perPage = 10;
        }
        $page = $query->orderBy('name')->paginate($perPage);

        // each customer of the page with what they owe
        $rows = [];
        foreach ($page->items() as $customer) {
            $rows[] = [
                'id'      => $customer->id,
                'name'    => $customer->name,
                'phone'   => $customer->phone,
                'address' => $customer->address,
                'due'     => $this->sales->customerDue($customer->id),
            ];
        }
        $page->setCollection(collect($rows));

        return $page;
    }

    // Money receipt form of one customer: opening balance and every approved SO still due
    public function receiptForm(Customer $customer): array
    {
        $lines = [];

        $opening = $this->openingDue($customer);
        if ($opening['due'] > 0) {
            $lines[] = $opening;
        }

        $receivedBySale = $this->receivedBySale($customer->id);
        $returnedBySale = $this->returnedBySale($customer->id);
        $sales = Sale::where('customer_id', $customer->id)
            ->where('status', Sale::APPROVED)
            ->orderBy('order_date')
            ->orderBy('id')
            ->get();

        foreach ($sales as $sale) {
            // money received and goods returned both pay the invoice
            $paid = (float) ($receivedBySale[$sale->id] ?? 0) + (float) ($returnedBySale[$sale->id] ?? 0);
            $due = round($sale->grand_total - $paid, 2);

            if ($due > 0) {
                $lines[] = [
                    'sale_id'       => $sale->id,
                    'order_no'      => $sale->so_no,
                    'memo_no'       => $sale->memo_no,
                    'order_date'    => $sale->order_date->toDateString(),
                    'bill_amount'   => (float) $sale->grand_total,
                    'prev_received' => round($paid, 2),
                    'due'           => $due,
                ];
            }
        }

        return [
            'customer_id'     => $customer->id,
            'name'            => $customer->name,
            'phone'           => $customer->phone,
            'address'         => $customer->address,
            'total_due'       => $this->sales->customerDue($customer->id),
            'advance_balance' => $this->advanceBalance($customer->id),
            'banks'           => Lookup::bankNames(),
            'lines'           => $lines,
        ];
    }

    public function createReceipt(Customer $customer, array $data): string
    {
        $isAdjustment = $data['received_type'] == MoneyReceipt::ADJUSTMENT;
        if ($isAdjustment) {
            // the advance pays the invoices: no bank, no new advance
            $data['bank_name'] = null;
            $data['customer_bank_name'] = null;
            $data['cheque_no'] = null;
            $data['cheque_date'] = null;

            if ($data['lot_amount'] > $this->advanceBalance($customer->id)) {
                throw new \RuntimeException('Adjustment amount exceeded the advance amount.');
            }
        }

        if (in_array($data['received_type'], self::BANK_TYPES) && empty($data['bank_name'])) {
            throw new \RuntimeException('Please select a Bank Name');
        }

        // same customer, date and lot saved in the last 30 seconds = double click
        $duplicate = MoneyReceipt::where('customer_id', $customer->id)
            ->whereDate('receipt_date', $data['receipt_date'])
            ->where('lot_amount', $data['lot_amount'])
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        // what each invoice can still take, worked out again here (never trust the form);
        // the opening line has no sale, so it is kept under "Opening"
        $dues = [];
        foreach ($this->receiptForm($customer)['lines'] as $dueLine) {
            $key = $dueLine['sale_id'] ?? MoneyReceipt::OPENING;
            $dues[$key] = $dueLine;
        }

        // the form lines with an amount, rounded
        $lines = [];
        $given = 0;
        foreach ($data['lines'] ?? [] as $formLine) {
            $line = [
                'key'      => $formLine['sale_id'] ?? MoneyReceipt::OPENING,
                'amount'   => round((float) ($formLine['amount'] ?? 0), 2),
                'discount' => round((float) ($formLine['discount'] ?? 0), 2),
                'vds'      => round((float) ($formLine['vds'] ?? 0), 2),
                'tds'      => round((float) ($formLine['tds'] ?? 0), 2),
            ];
            $lineTotal = $line['amount'] + $line['discount'] + $line['vds'] + $line['tds'];
            if ($lineTotal <= 0) {
                continue;
            }

            if (!isset($dues[$line['key']])) {
                throw new \RuntimeException('This invoice has no due left.');
            }
            $due = $dues[$line['key']];
            if ($lineTotal > $due['due']) {
                $name = 'Opening';
                if ($due['sale_id']) {
                    $name = $due['order_no'];
                }
                throw new \RuntimeException('Received amount is more than the due of ' . $name . '.');
            }

            $lines[] = $line;
            $given += $line['amount'];
        }

        $lot = round((float) $data['lot_amount'], 2);
        $given = round($given, 2);
        if ($given > $lot) {
            throw new \RuntimeException('Received amount can not be more than the Lot Amount.');
        }

        // what is left of the lot is an advance (an Adjustment never makes a new advance)
        $advance = 0;
        if (!$isAdjustment) {
            $advance = round($lot - $given, 2);
        }
        if (count($lines) === 0 && $advance <= 0) {
            throw new \RuntimeException('Please insert amount!');
        }

        DB::beginTransaction();
        try {
            $mrNo = $this->scrollCodes->nextNumber('money_receipt', $data['receipt_date']);

            // the same on every line of this MR
            $common = [
                'mr_no'              => $mrNo,
                'company_id'         => $customer->company_id,
                'customer_id'        => $customer->id,
                'receipt_date'       => $data['receipt_date'],
                'received_type'      => $data['received_type'],
                'lot_amount'         => $lot,
                'bank_name'          => $data['bank_name'] ?? null,
                'customer_bank_name' => $data['customer_bank_name'] ?? null,
                'cheque_no'          => $data['cheque_no'] ?? null,
                'cheque_date'        => $data['cheque_date'] ?? null,
                'remarks'            => $data['remarks'] ?? null,
                'created_by'         => Auth::id(),
            ];

            foreach ($lines as $line) {
                $due = $dues[$line['key']];

                $receiptData = $common;
                $receiptData['sale_id'] = $due['sale_id'] ?? null;
                $receiptData['order_no'] = $due['order_no'];
                $receiptData['amount'] = $line['amount'];
                $receiptData['discount'] = $line['discount'];
                $receiptData['vds'] = $line['vds'];
                $receiptData['tds'] = $line['tds'];
                $receiptData['bill_amount'] = $due['bill_amount'];
                $receiptData['prev_received_amount'] = $due['prev_received'];
                $receiptData['receivable_amount'] = $due['due'];
                MoneyReceipt::create($receiptData);
            }

            if ($advance > 0) {
                $receiptData = $common;
                $receiptData['order_no'] = MoneyReceipt::ADVANCE;
                $receiptData['amount'] = $advance;
                MoneyReceipt::create($receiptData);
            }

            DB::commit();
            return $mrNo;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // "Manage Money Receipt": one row per MR no
    public function getReceiptRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('money_receipts')
            ->join('customers', 'customers.id', '=', 'money_receipts.customer_id')
            ->whereNull('money_receipts.deleted_at')
            ->select(
                'money_receipts.mr_no',
                'money_receipts.customer_id',
                'customers.name as customer_name',
                'money_receipts.received_type',
                DB::raw('MAX(money_receipts.id) as id'),
                DB::raw('MAX(money_receipts.receipt_date) as receipt_date'),
                DB::raw('MAX(money_receipts.lot_amount) as lot_amount'),
                DB::raw('SUM(money_receipts.amount) as received_amount'),
                DB::raw('SUM(money_receipts.discount) as discount'),
                DB::raw('SUM(money_receipts.vds) as vds'),
                DB::raw('SUM(money_receipts.tds) as tds'),
                DB::raw('SUM(money_receipts.amount + money_receipts.discount + money_receipts.vds + money_receipts.tds) as total_amount'),
                DB::raw("GROUP_CONCAT(money_receipts.order_no ORDER BY money_receipts.id SEPARATOR ', ') as order_nos")
            )
            ->groupBy('money_receipts.mr_no', 'money_receipts.customer_id', 'customers.name', 'money_receipts.received_type');

        // a company user can only see the receipts of own company
        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('money_receipts.company_id', $ownCompanyId);
        }

        if (!empty($filters['mr_no'])) {
            $query->where('money_receipts.mr_no', 'like', '%' . $filters['mr_no'] . '%');
        }
        if (!empty($filters['customer_name'])) {
            $query->where('customers.name', 'like', '%' . $filters['customer_name'] . '%');
        }
        if (!empty($filters['order_no'])) {
            $query->where('money_receipts.order_no', 'like', '%' . $filters['order_no'] . '%');
        }
        if (!empty($filters['received_type'])) {
            $query->where('money_receipts.received_type', $filters['received_type']);
        }
        if (!empty($filters['receipt_date'])) {
            $query->whereDate('money_receipts.receipt_date', $filters['receipt_date']);
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc(DB::raw('MAX(money_receipts.id)'))->paginate($perPage);
    }

    // MR voucher: every line of one MR no
    public function getReceipt(string $mrNo): array
    {
        $receipts = MoneyReceipt::with('customer:id,name,phone,address', 'company:id,name,address,phone', 'createdBy:id,name')
            ->where('mr_no', $mrNo)
            ->orderBy('id')
            ->get();
        if ($receipts->isEmpty()) {
            throw new \RuntimeException('Money receipt not found.');
        }

        $lines = [];
        foreach ($receipts as $receipt) {
            $lines[] = $receipt->only('id', 'order_no', 'bill_amount', 'prev_received_amount', 'receivable_amount',
                'amount', 'discount', 'vds', 'tds');
        }

        // the MR details are the same on every line, so they are read from the first one
        $first = $receipts->first();
        $chequeDate = null;
        if ($first->cheque_date) {
            $chequeDate = $first->cheque_date->toDateString();
        }

        return [
            'mr_no'              => $mrNo,
            'receipt_date'       => $first->receipt_date->toDateString(),
            'received_type'      => $first->received_type,
            'lot_amount'         => (float) $first->lot_amount,
            'bank_name'          => $first->bank_name,
            'customer_bank_name' => $first->customer_bank_name,
            'cheque_no'          => $first->cheque_no,
            'cheque_date'        => $chequeDate,
            'remarks'            => $first->remarks,
            'customer'           => $first->customer,
            'company'            => $first->company,
            'created_by'         => $first->createdBy,
            'lines'              => $lines,
        ];
    }

    // parts_bazar moneyReceipt/delete: every line of the MR no goes
    public function deleteReceipt(string $mrNo): void
    {
        $receipts = MoneyReceipt::where('mr_no', $mrNo)->get();
        if ($receipts->isEmpty()) {
            throw new \RuntimeException('Money receipt not found.');
        }

        // an advance that was already used by an Adjustment MR can not go away first
        $advance = 0;
        foreach ($receipts as $receipt) {
            if ($receipt->order_no == MoneyReceipt::ADVANCE) {
                $advance += (float) $receipt->amount;
            }
        }
        if ($advance > 0 && $advance > $this->advanceBalance($receipts->first()->customer_id)) {
            throw new \RuntimeException('The advance of this MR is already adjusted. Delete the Adjustment MR first.');
        }

        MoneyReceipt::where('mr_no', $mrNo)->update(['deleted_by' => Auth::id(), 'deleted_at' => now()]);
    }

    // parts_bazar customerAdvanceBalanceFromMR: advance lines minus what Adjustment MRs used
    public function advanceBalance(int $customerId): float
    {
        $advance = MoneyReceipt::where('customer_id', $customerId)->where('order_no', MoneyReceipt::ADVANCE)->sum('amount');
        $adjusted = MoneyReceipt::where('customer_id', $customerId)->where('received_type', MoneyReceipt::ADJUSTMENT)->sum('amount');

        return round($advance - $adjusted, 2);
    }

    // Opening line: debit opening balance minus what was received against it
    private function openingDue(Customer $customer): array
    {
        $opening = 0;
        if ($customer->opening_balance_type == '1') {
            $opening = (float) $customer->opening_balance;
        }

        $paid = (float) MoneyReceipt::where('customer_id', $customer->id)
            ->where('order_no', MoneyReceipt::OPENING)
            ->sum(DB::raw('amount + discount + vds + tds'));

        return [
            'sale_id'       => null,
            'order_no'      => MoneyReceipt::OPENING,
            'memo_no'       => null,
            'order_date'    => null,
            'bill_amount'   => $opening,
            'prev_received' => round($paid, 2),
            'due'           => round($opening - $paid, 2),
        ];
    }

    // money received per SO, as [sale id => amount]
    private function receivedBySale(int $customerId)
    {
        return MoneyReceipt::where('customer_id', $customerId)
            ->whereNotNull('sale_id')
            ->groupBy('sale_id')
            ->pluck(DB::raw('SUM(amount + discount + vds + tds)'), 'sale_id');
    }

    // parts_bazar totalSoReturnAmount: returns that were not paid back in cash lower the SO due
    private function returnedBySale(int $customerId)
    {
        return SaleReturn::where('customer_id', $customerId)
            ->where('is_refund', 0)
            ->groupBy('sale_id')
            ->pluck(DB::raw('SUM(total_amount)'), 'sale_id');
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
