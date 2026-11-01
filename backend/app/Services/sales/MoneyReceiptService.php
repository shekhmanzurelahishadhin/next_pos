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
        $query = Customer::query()
            ->select('id', 'name', 'phone', 'address', 'company_id')
            ->when($filters['name'] ?? null, fn($q, $v) => $q->where('name', 'like', "%{$v}%"))
            ->when($filters['phone'] ?? null, fn($q, $v) => $q->where('phone', 'like', "%{$v}%"));

        if ($this->ownCompanyId()) {
            $query->where('company_id', $this->ownCompanyId());
        }

        $page = $query->orderBy('name')->paginate($perPage ?: 10);
        $page->getCollection()->transform(fn($customer) => [
            'id'      => $customer->id,
            'name'    => $customer->name,
            'phone'   => $customer->phone,
            'address' => $customer->address,
            'due'     => $this->sales->customerDue($customer->id),
        ]);
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

        $received = $this->receivedBySale($customer->id);
        $returned = $this->returnedBySale($customer->id);
        $sales = Sale::where('customer_id', $customer->id)->where('status', Sale::APPROVED)
            ->orderBy('order_date')->orderBy('id')->get();

        foreach ($sales as $sale) {
            $paid = (float) ($received[$sale->id] ?? 0) + (float) ($returned[$sale->id] ?? 0);
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
            $data = array_merge($data, ['bank_name' => null, 'customer_bank_name' => null, 'cheque_no' => null, 'cheque_date' => null]);
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

        // what each invoice can still take, worked out again here (never trust the form)
        $dues = collect($this->receiptForm($customer)['lines'])->keyBy(fn($line) => $line['sale_id'] ?? MoneyReceipt::OPENING);

        $lines = collect($data['lines'] ?? [])->map(fn($line) => [
            'key'      => $line['sale_id'] ?? MoneyReceipt::OPENING,
            'amount'   => round((float) ($line['amount'] ?? 0), 2),
            'discount' => round((float) ($line['discount'] ?? 0), 2),
            'vds'      => round((float) ($line['vds'] ?? 0), 2),
            'tds'      => round((float) ($line['tds'] ?? 0), 2),
        ])->filter(fn($line) => $line['amount'] + $line['discount'] + $line['vds'] + $line['tds'] > 0);

        foreach ($lines as $line) {
            $due = $dues->get($line['key']);
            if (!$due) {
                throw new \RuntimeException('This invoice has no due left.');
            }
            if ($line['amount'] + $line['discount'] + $line['vds'] + $line['tds'] > $due['due']) {
                $name = $due['sale_id'] ? $due['order_no'] : 'Opening';
                throw new \RuntimeException("Received amount is more than the due of {$name}.");
            }
        }

        $lot = round((float) $data['lot_amount'], 2);
        $given = round($lines->sum('amount'), 2);
        if ($given > $lot) {
            throw new \RuntimeException('Received amount can not be more than the Lot Amount.');
        }
        $advance = $isAdjustment ? 0 : round($lot - $given, 2);
        if ($lines->isEmpty() && $advance <= 0) {
            throw new \RuntimeException('Please insert amount!');
        }

        return DB::transaction(function () use ($customer, $data, $lines, $dues, $lot, $advance) {
            $mrNo = $this->scrollCodes->nextNumber('money_receipt', $data['receipt_date']);
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
                $due = $dues->get($line['key']);
                MoneyReceipt::create($common + [
                    'sale_id'              => $due['sale_id'] ?? null,
                    'order_no'             => $due['order_no'],
                    'amount'               => $line['amount'],
                    'discount'             => $line['discount'],
                    'vds'                  => $line['vds'],
                    'tds'                  => $line['tds'],
                    'bill_amount'          => $due['bill_amount'],
                    'prev_received_amount' => $due['prev_received'],
                    'receivable_amount'    => $due['due'],
                ]);
            }

            if ($advance > 0) {
                MoneyReceipt::create($common + ['order_no' => MoneyReceipt::ADVANCE, 'amount' => $advance]);
            }

            return $mrNo;
        });
    }

    // "Manage Money Receipt": one row per MR no
    public function getReceiptRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('money_receipts as m')
            ->join('customers as c', 'c.id', '=', 'm.customer_id')
            ->whereNull('m.deleted_at')
            ->select(
                'm.mr_no', 'm.customer_id', 'c.name as customer_name', 'm.received_type',
                DB::raw('MAX(m.id) as id'),
                DB::raw('MAX(m.receipt_date) as receipt_date'),
                DB::raw('MAX(m.lot_amount) as lot_amount'),
                DB::raw('SUM(m.amount) as received_amount'),
                DB::raw('SUM(m.discount) as discount'),
                DB::raw('SUM(m.vds) as vds'),
                DB::raw('SUM(m.tds) as tds'),
                DB::raw('SUM(m.amount + m.discount + m.vds + m.tds) as total_amount'),
                DB::raw("GROUP_CONCAT(m.order_no ORDER BY m.id SEPARATOR ', ') as order_nos")
            )
            ->groupBy('m.mr_no', 'm.customer_id', 'c.name', 'm.received_type');

        if ($this->ownCompanyId()) {
            $query->where('m.company_id', $this->ownCompanyId());
        }

        $query
            ->when($filters['mr_no'] ?? null, fn($q, $v) => $q->where('m.mr_no', 'like', "%{$v}%"))
            ->when($filters['customer_name'] ?? null, fn($q, $v) => $q->where('c.name', 'like', "%{$v}%"))
            ->when($filters['order_no'] ?? null, fn($q, $v) => $q->where('m.order_no', 'like', "%{$v}%"))
            ->when($filters['received_type'] ?? null, fn($q, $v) => $q->where('m.received_type', $v))
            ->when($filters['receipt_date'] ?? null, fn($q, $v) => $q->whereDate('m.receipt_date', $v));

        return $query->orderByDesc(DB::raw('MAX(m.id)'))->paginate($perPage ?: 10);
    }

    // MR voucher: every line of one MR no
    public function getReceipt(string $mrNo): array
    {
        $lines = MoneyReceipt::with('customer:id,name,phone,address', 'company:id,name,address,phone', 'createdBy:id,name')
            ->where('mr_no', $mrNo)->orderBy('id')->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Money receipt not found.');
        }

        $first = $lines->first();
        return [
            'mr_no'              => $mrNo,
            'receipt_date'       => $first->receipt_date->toDateString(),
            'received_type'      => $first->received_type,
            'lot_amount'         => (float) $first->lot_amount,
            'bank_name'          => $first->bank_name,
            'customer_bank_name' => $first->customer_bank_name,
            'cheque_no'          => $first->cheque_no,
            'cheque_date'        => $first->cheque_date?->toDateString(),
            'remarks'            => $first->remarks,
            'customer'           => $first->customer,
            'company'            => $first->company,
            'created_by'         => $first->createdBy,
            'lines'              => $lines->map(fn($line) => $line->only('id', 'order_no', 'bill_amount', 'prev_received_amount',
                'receivable_amount', 'amount', 'discount', 'vds', 'tds')),
        ];
    }

    // parts_bazar moneyReceipt/delete: every line of the MR no goes
    public function deleteReceipt(string $mrNo): void
    {
        $lines = MoneyReceipt::where('mr_no', $mrNo)->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Money receipt not found.');
        }
        // an advance that was already used by an Adjustment MR can not go away first
        $advance = (float) $lines->where('order_no', MoneyReceipt::ADVANCE)->sum('amount');
        if ($advance > 0 && $advance > $this->advanceBalance($lines->first()->customer_id)) {
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
        $opening = $customer->opening_balance_type == '1' ? (float) $customer->opening_balance : 0;
        $paid = (float) MoneyReceipt::where('customer_id', $customer->id)->where('order_no', MoneyReceipt::OPENING)
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

    private function receivedBySale(int $customerId)
    {
        return MoneyReceipt::where('customer_id', $customerId)->whereNotNull('sale_id')
            ->groupBy('sale_id')->pluck(DB::raw('SUM(amount + discount + vds + tds)'), 'sale_id');
    }

    // parts_bazar totalSoReturnAmount: returns that were not paid back in cash lower the SO due
    private function returnedBySale(int $customerId)
    {
        return SaleReturn::where('customer_id', $customerId)->where('is_refund', 0)
            ->groupBy('sale_id')->pluck(DB::raw('SUM(total_amount)'), 'sale_id');
    }

    private function ownCompanyId(): ?int
    {
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            return (int) $user->company_id;
        }
        return null;
    }
}
