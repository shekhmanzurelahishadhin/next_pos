<?php

namespace App\Services\purchase;

use App\Models\purchase\Purchase;
use App\Models\purchase\PurchaseReturn;
use App\Models\purchase\Supplier;
use App\Models\purchase\SupplierPayment;
use App\Models\softConfig\Lookup;
use App\Services\softConfig\ScrollCodeService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Supplier payment, same flow as parts_bazar paymentReceipt/addPaymentReceipt:
// pick a supplier, give a lot amount, "Distribute" it over the due POs (oldest first),
// what is left over is saved as an advance line. One PR no (sl_no), one row per PO.
class SupplierPaymentService
{
    const BANK_TYPES = ['2', '3']; // cheque, deposit into bank need a bank name

    public function __construct(private ScrollCodeService $scrollCodes, private PurchaseService $purchases)
    {
    }

    // "Create Supplier Payment" page: suppliers with their due
    public function getSupplierRows(array $filters = [], $perPage = 10)
    {
        $page = Supplier::query()
            ->select('id', 'name', 'phone', 'address')
            ->when($filters['name'] ?? null, fn($q, $v) => $q->where('name', 'like', "%{$v}%"))
            ->when($filters['phone'] ?? null, fn($q, $v) => $q->where('phone', 'like', "%{$v}%"))
            ->orderBy('name')
            ->paginate($perPage ?: 10);

        $page->getCollection()->transform(fn($supplier) => [
            'id'      => $supplier->id,
            'name'    => $supplier->name,
            'phone'   => $supplier->phone,
            'address' => $supplier->address,
            'due'     => $this->purchases->supplierDue($supplier->id),
        ]);
        return $page;
    }

    // Payment form of one supplier: opening balance and every approved PO still due
    public function paymentForm(Supplier $supplier): array
    {
        $lines = [];

        $opening = $this->openingDue($supplier);
        if ($opening['due'] > 0) {
            $lines[] = $opening;
        }

        $paidByPo = $this->paidByPurchase($supplier->id);
        $returnedByPo = $this->returnedByPurchase($supplier->id);
        $purchases = Purchase::where('supplier_id', $supplier->id)->where('status', Purchase::APPROVED)
            ->orderBy('purchase_date')->orderBy('id')->get();

        foreach ($purchases as $purchase) {
            $paid = (float) ($paidByPo[$purchase->id] ?? 0) + (float) ($returnedByPo[$purchase->id] ?? 0);
            $due = round($purchase->grand_total - $paid, 2);
            if ($due > 0) {
                $lines[] = [
                    'purchase_id'      => $purchase->id,
                    'po_no'            => $purchase->po_no,
                    'supplier_bill_no' => $purchase->supplier_bill_no,
                    'po_date'          => $purchase->purchase_date->toDateString(),
                    'company_id'       => $purchase->company_id,
                    'bill_amount'      => (float) $purchase->grand_total,
                    'prev_paid'        => round($paid, 2),
                    'due'              => $due,
                ];
            }
        }

        return [
            'supplier_id' => $supplier->id,
            'name'        => $supplier->name,
            'phone'       => $supplier->phone,
            'address'     => $supplier->address,
            'total_due'       => $this->purchases->supplierDue($supplier->id),
            'advance_balance' => $this->advanceBalance($supplier->id),
            'banks'           => Lookup::bankNames(),
            'lines'           => $lines,
        ];
    }

    public function createPayment(Supplier $supplier, array $data): string
    {
        $isAdjustment = $data['payment_type'] == SupplierPayment::ADJUSTMENT;
        if ($isAdjustment) {
            // the advance pays the POs: no bank, no new advance
            $data = array_merge($data, ['bank_name' => null, 'cheque_no' => null, 'cheque_date' => null]);
            if ($data['lot_amount'] > $this->advanceBalance($supplier->id)) {
                throw new \RuntimeException('Adjustment amount exceeded the advance amount.');
            }
        }

        if (in_array($data['payment_type'], self::BANK_TYPES) && empty($data['bank_name'])) {
            throw new \RuntimeException('Select Bank Name');
        }

        // same supplier, date and lot saved in the last 30 seconds = double click
        $duplicate = SupplierPayment::where('supplier_id', $supplier->id)
            ->whereDate('payment_date', $data['payment_date'])
            ->where('lot_amount', $data['lot_amount'])
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        // what each PO can still take, worked out again here (never trust the form)
        $dues = collect($this->paymentForm($supplier)['lines'])->keyBy(fn($line) => $line['purchase_id'] ?? SupplierPayment::OPENING);

        $lines = collect($data['lines'] ?? [])->map(fn($line) => [
            'key'      => $line['purchase_id'] ?? SupplierPayment::OPENING,
            'amount'   => round((float) ($line['amount'] ?? 0), 2),
            'discount' => round((float) ($line['discount'] ?? 0), 2),
        ])->filter(fn($line) => $line['amount'] + $line['discount'] > 0);

        foreach ($lines as $line) {
            $due = $dues->get($line['key']);
            if (!$due) {
                throw new \RuntimeException('This PO has no due left.');
            }
            if ($line['amount'] + $line['discount'] > $due['due']) {
                $name = $due['purchase_id'] ? $due['po_no'] : 'Opening';
                throw new \RuntimeException("Payment amount is more than the due of {$name}.");
            }
        }

        $lot = round((float) $data['lot_amount'], 2);
        $given = round($lines->sum('amount'), 2);
        if ($given > $lot) {
            throw new \RuntimeException('Payment amount can not be more than the Lot Amount.');
        }
        $advance = $isAdjustment ? 0 : round($lot - $given, 2);
        if ($lines->isEmpty() && $advance <= 0) {
            throw new \RuntimeException('Please check total receive amount !');
        }

        return DB::transaction(function () use ($supplier, $data, $lines, $dues, $lot, $advance) {
            $slNo = $this->scrollCodes->nextNumber('supplier_payment', $data['payment_date']);
            $common = [
                'sl_no'          => $slNo,
                'supplier_id'    => $supplier->id,
                'payment_date'   => $data['payment_date'],
                'payment_type'   => $data['payment_type'],
                'lot_amount'     => $lot,
                'supplier_mr_no' => $data['supplier_mr_no'] ?? null,
                'bank_name'      => $data['bank_name'] ?? null,
                'cheque_no'      => $data['cheque_no'] ?? null,
                'cheque_date'    => $data['cheque_date'] ?? null,
                'remarks'        => $data['remarks'] ?? null,
            ];

            foreach ($lines as $line) {
                $due = $dues->get($line['key']);
                SupplierPayment::create($common + [
                    'company_id'        => $due['company_id'] ?? $this->ownCompanyId(),
                    'purchase_id'       => $due['purchase_id'] ?? null,
                    'po_no'             => $due['po_no'],
                    'supplier_bill_no'  => $due['supplier_bill_no'],
                    'amount'            => $line['amount'],
                    'discount'          => $line['discount'],
                    'bill_amount'       => $due['bill_amount'],
                    'prev_paid_amount'  => $due['prev_paid'],
                    'receivable_amount' => $due['due'],
                ]);
            }

            if ($advance > 0) {
                SupplierPayment::create($common + [
                    'company_id' => $this->ownCompanyId(),
                    'po_no'      => SupplierPayment::ADVANCE,
                    'amount'     => $advance,
                ]);
            }

            return $slNo;
        });
    }

    // "Manage Supplier Payment": one row per PR no
    public function getPaymentRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('supplier_payments as p')
            ->join('suppliers as s', 's.id', '=', 'p.supplier_id')
            ->whereNull('p.deleted_at')
            ->select(
                'p.sl_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type',
                DB::raw('MAX(p.id) as id'),
                DB::raw('MAX(p.payment_date) as payment_date'),
                DB::raw('MAX(p.lot_amount) as lot_amount'),
                DB::raw('SUM(p.amount) as paid_amount'),
                DB::raw('SUM(p.discount) as discount'),
                DB::raw('SUM(p.amount + p.discount) as total_amount'),
                DB::raw("GROUP_CONCAT(p.po_no ORDER BY p.id SEPARATOR ', ') as po_nos")
            )
            ->groupBy('p.sl_no', 'p.supplier_id', 's.name', 'p.payment_type');

        if ($this->ownCompanyId()) {
            $query->where('p.company_id', $this->ownCompanyId());
        }

        $query
            ->when($filters['sl_no'] ?? null, fn($q, $v) => $q->where('p.sl_no', 'like', "%{$v}%"))
            ->when($filters['supplier_name'] ?? null, fn($q, $v) => $q->where('s.name', 'like', "%{$v}%"))
            ->when($filters['po_no'] ?? null, fn($q, $v) => $q->where('p.po_no', 'like', "%{$v}%"))
            ->when($filters['payment_type'] ?? null, fn($q, $v) => $q->where('p.payment_type', $v))
            ->when($filters['payment_date'] ?? null, fn($q, $v) => $q->whereDate('p.payment_date', $v));

        return $query->orderByDesc(DB::raw('MAX(p.id)'))->paginate($perPage ?: 10);
    }

    // Payment voucher: every line of one PR no
    public function getPayment(string $slNo): array
    {
        $lines = SupplierPayment::with('supplier:id,name,phone,address', 'company:id,name,address,phone', 'createdBy:id,name')
            ->where('sl_no', $slNo)->orderBy('id')->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Supplier payment not found.');
        }

        $first = $lines->first();
        return [
            'sl_no'          => $slNo,
            'payment_date'   => $first->payment_date->toDateString(),
            'payment_type'   => $first->payment_type,
            'lot_amount'     => (float) $first->lot_amount,
            'supplier_mr_no' => $first->supplier_mr_no,
            'bank_name'      => $first->bank_name,
            'cheque_no'      => $first->cheque_no,
            'cheque_date'    => $first->cheque_date?->toDateString(),
            'remarks'        => $first->remarks,
            'supplier'       => $first->supplier,
            'company'        => $lines->firstWhere('company_id')?->company,
            'created_by'     => $first->createdBy,
            'lines'          => $lines->map(fn($line) => $line->only('id', 'po_no', 'supplier_bill_no', 'bill_amount',
                'prev_paid_amount', 'receivable_amount', 'amount', 'discount')),
        ];
    }

    // parts_bazar paymentReceipt/delete: every line of the PR no goes
    public function deletePayment(string $slNo): void
    {
        $lines = SupplierPayment::where('sl_no', $slNo)->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Supplier payment not found.');
        }
        // an advance that was already used by an Adjustment payment can not go away first
        $advance = (float) $lines->where('po_no', SupplierPayment::ADVANCE)->sum('amount');
        if ($advance > 0 && $advance > $this->advanceBalance($lines->first()->supplier_id)) {
            throw new \RuntimeException('The advance of this payment is already adjusted. Delete the Adjustment payment first.');
        }
        DB::transaction(fn() => $lines->each->delete());
    }

    // parts_bazar supplierAdvanceBalanceFromPR: advance lines minus what Adjustment payments used
    public function advanceBalance(int $supplierId): float
    {
        $advance = SupplierPayment::where('supplier_id', $supplierId)->where('po_no', SupplierPayment::ADVANCE)->sum('amount');
        $adjusted = SupplierPayment::where('supplier_id', $supplierId)->where('payment_type', SupplierPayment::ADJUSTMENT)->sum('amount');
        return round($advance - $adjusted, 2);
    }

    // Opening line: credit opening balance (we owe them) minus what was paid against it
    private function openingDue(Supplier $supplier): array
    {
        $opening = $supplier->opening_balance_type == '2' ? (float) $supplier->opening_balance : 0;
        $paid = (float) SupplierPayment::where('supplier_id', $supplier->id)->where('po_no', SupplierPayment::OPENING)
            ->sum(DB::raw('amount + discount'));

        return [
            'purchase_id'      => null,
            'po_no'            => SupplierPayment::OPENING,
            'supplier_bill_no' => null,
            'po_date'          => null,
            'company_id'       => null,
            'bill_amount'      => $opening,
            'prev_paid'        => round($paid, 2),
            'due'              => round($opening - $paid, 2),
        ];
    }

    private function paidByPurchase(int $supplierId)
    {
        return SupplierPayment::where('supplier_id', $supplierId)->whereNotNull('purchase_id')
            ->groupBy('purchase_id')->pluck(DB::raw('SUM(amount + discount)'), 'purchase_id');
    }

    // returns the supplier did not pay back in cash lower the PO due
    private function returnedByPurchase(int $supplierId)
    {
        return PurchaseReturn::where('supplier_id', $supplierId)->where('is_refund', 0)
            ->groupBy('purchase_id')->pluck(DB::raw('SUM(total_amount)'), 'purchase_id');
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
