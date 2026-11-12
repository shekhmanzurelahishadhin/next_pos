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
        $query = Supplier::query()->select('id', 'name', 'phone', 'address');

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['phone'])) {
            $query->where('phone', 'like', '%' . $filters['phone'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }
        $page = $query->orderBy('name')->paginate($perPage);

        // add the due of every supplier on this page
        $rows = [];
        foreach ($page->items() as $supplier) {
            $rows[] = [
                'id'      => $supplier->id,
                'name'    => $supplier->name,
                'phone'   => $supplier->phone,
                'address' => $supplier->address,
                'due'     => $this->purchases->supplierDue($supplier->id),
            ];
        }
        $page->setCollection(collect($rows));

        return $page;
    }

    // Payment form of one supplier: the opening balance and every approved PO that is still due
    public function paymentForm(Supplier $supplier): array
    {
        $lines = [];

        $opening = $this->openingDue($supplier);
        if ($opening['due'] > 0) {
            $lines[] = $opening;
        }

        $paidByPurchase = $this->paidByPurchase($supplier->id);
        $returnedByPurchase = $this->returnedByPurchase($supplier->id);

        $purchases = Purchase::where('supplier_id', $supplier->id)
            ->where('status', Purchase::APPROVED)
            ->orderBy('purchase_date')
            ->orderBy('id')
            ->get();

        foreach ($purchases as $purchase) {
            // paid = money paid + goods returned against this PO
            $paid = (float) ($paidByPurchase[$purchase->id] ?? 0) + (float) ($returnedByPurchase[$purchase->id] ?? 0);
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
            'supplier_id'     => $supplier->id,
            'name'            => $supplier->name,
            'phone'           => $supplier->phone,
            'address'         => $supplier->address,
            'total_due'       => $this->purchases->supplierDue($supplier->id),
            'advance_balance' => $this->advanceBalance($supplier->id),
            'banks'           => Lookup::bankNames(),
            'lines'           => $lines,
        ];
    }

    // Saves one payment (PR no) and returns its PR no
    public function createPayment(Supplier $supplier, array $data): string
    {
        $isAdjustment = $data['payment_type'] == SupplierPayment::ADJUSTMENT;
        if ($isAdjustment) {
            // the old advance pays the POs: no bank, no new advance
            $data['bank_name'] = null;
            $data['cheque_no'] = null;
            $data['cheque_date'] = null;

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

        // what each PO can still take, worked out again here (never trust the form);
        // the key is the purchase id, or "ob" for the opening balance line
        $dues = [];
        foreach ($this->paymentForm($supplier)['lines'] as $dueLine) {
            $key = $dueLine['purchase_id'] ?? SupplierPayment::OPENING;
            $dues[$key] = $dueLine;
        }

        // the lines of the form that pay something
        $lines = [];
        $formLines = $data['lines'] ?? [];
        foreach ($formLines as $formLine) {
            $amount = round((float) ($formLine['amount'] ?? 0), 2);
            $discount = round((float) ($formLine['discount'] ?? 0), 2);
            if ($amount + $discount <= 0) {
                continue;
            }

            $lines[] = [
                'key'      => $formLine['purchase_id'] ?? SupplierPayment::OPENING,
                'amount'   => $amount,
                'discount' => $discount,
            ];
        }

        $given = 0;
        foreach ($lines as $line) {
            if (!isset($dues[$line['key']])) {
                throw new \RuntimeException('This PO has no due left.');
            }

            $due = $dues[$line['key']];
            if ($line['amount'] + $line['discount'] > $due['due']) {
                $name = $due['purchase_id'] ? $due['po_no'] : 'Opening';
                throw new \RuntimeException("Payment amount is more than the due of {$name}.");
            }

            $given += $line['amount'];
        }

        $lot = round((float) $data['lot_amount'], 2);
        $given = round($given, 2);
        if ($given > $lot) {
            throw new \RuntimeException('Payment amount can not be more than the Lot Amount.');
        }

        // what is left of the lot is an advance (an adjustment never makes a new advance)
        $advance = 0;
        if (!$isAdjustment) {
            $advance = round($lot - $given, 2);
        }
        if (count($lines) == 0 && $advance <= 0) {
            throw new \RuntimeException('Please check total receive amount !');
        }

        DB::beginTransaction();
        try {
            $slNo = $this->scrollCodes->nextNumber('supplier_payment', $data['payment_date']);

            // fields that are the same on every line of this payment
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
                $due = $dues[$line['key']];

                $row = $common;
                $row['company_id'] = $due['company_id'] ?? $this->ownCompanyId();
                $row['purchase_id'] = $due['purchase_id'] ?? null;
                $row['po_no'] = $due['po_no'];
                $row['supplier_bill_no'] = $due['supplier_bill_no'];
                $row['amount'] = $line['amount'];
                $row['discount'] = $line['discount'];
                $row['bill_amount'] = $due['bill_amount'];
                $row['prev_paid_amount'] = $due['prev_paid'];
                $row['receivable_amount'] = $due['due'];
                SupplierPayment::create($row);
            }

            if ($advance > 0) {
                $row = $common;
                $row['company_id'] = $this->ownCompanyId();
                $row['po_no'] = SupplierPayment::ADVANCE;
                $row['amount'] = $advance;
                SupplierPayment::create($row);
            }

            DB::commit();
            return $slNo;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // "Manage Supplier Payment": one row per PR no
    public function getPaymentRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('supplier_payments')
            ->join('suppliers', 'suppliers.id', '=', 'supplier_payments.supplier_id')
            ->whereNull('supplier_payments.deleted_at')
            ->select(
                'supplier_payments.sl_no',
                'supplier_payments.supplier_id',
                'suppliers.name as supplier_name',
                'supplier_payments.payment_type'
            )
            ->selectRaw('MAX(supplier_payments.id) as id')
            ->selectRaw('MAX(supplier_payments.payment_date) as payment_date')
            ->selectRaw('MAX(supplier_payments.lot_amount) as lot_amount')
            ->selectRaw('SUM(supplier_payments.amount) as paid_amount')
            ->selectRaw('SUM(supplier_payments.discount) as discount')
            ->selectRaw('SUM(supplier_payments.amount + supplier_payments.discount) as total_amount')
            ->selectRaw("GROUP_CONCAT(supplier_payments.po_no ORDER BY supplier_payments.id SEPARATOR ', ') as po_nos")
            ->groupBy('supplier_payments.sl_no', 'supplier_payments.supplier_id', 'suppliers.name', 'supplier_payments.payment_type');

        $ownCompanyId = $this->ownCompanyId();
        if ($ownCompanyId) {
            $query->where('supplier_payments.company_id', $ownCompanyId);
        }

        if (!empty($filters['sl_no'])) {
            $query->where('supplier_payments.sl_no', 'like', '%' . $filters['sl_no'] . '%');
        }
        if (!empty($filters['supplier_name'])) {
            $query->where('suppliers.name', 'like', '%' . $filters['supplier_name'] . '%');
        }
        if (!empty($filters['po_no'])) {
            $query->where('supplier_payments.po_no', 'like', '%' . $filters['po_no'] . '%');
        }
        if (!empty($filters['payment_type'])) {
            $query->where('supplier_payments.payment_type', $filters['payment_type']);
        }
        if (!empty($filters['payment_date'])) {
            $query->whereDate('supplier_payments.payment_date', $filters['payment_date']);
        }

        if (!$perPage) {
            $perPage = 10;
        }

        // newest payment first
        return $query->orderByDesc(DB::raw('MAX(supplier_payments.id)'))->paginate($perPage);
    }

    // Payment voucher: every line of one PR no
    public function getPayment(string $slNo): array
    {
        $lines = SupplierPayment::with('supplier:id,name,phone,address', 'company:id,name,address,phone', 'createdBy:id,name')
            ->where('sl_no', $slNo)
            ->orderBy('id')
            ->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Supplier payment not found.');
        }

        $first = $lines->first();

        // the company of the first line that has one (an advance line of a Super Admin has none)
        $company = null;
        foreach ($lines as $line) {
            if ($line->company_id) {
                $company = $line->company;
                break;
            }
        }

        $voucherLines = [];
        foreach ($lines as $line) {
            $voucherLines[] = $line->only('id', 'po_no', 'supplier_bill_no', 'bill_amount', 'prev_paid_amount', 'receivable_amount', 'amount', 'discount');
        }

        return [
            'sl_no'          => $slNo,
            'payment_date'   => $first->payment_date->toDateString(),
            'payment_type'   => $first->payment_type,
            'lot_amount'     => (float) $first->lot_amount,
            'supplier_mr_no' => $first->supplier_mr_no,
            'bank_name'      => $first->bank_name,
            'cheque_no'      => $first->cheque_no,
            'cheque_date'    => $first->cheque_date ? $first->cheque_date->toDateString() : null,
            'remarks'        => $first->remarks,
            'supplier'       => $first->supplier,
            'company'        => $company,
            'created_by'     => $first->createdBy,
            'lines'          => $voucherLines,
        ];
    }

    // parts_bazar paymentReceipt/delete: every line of the PR no goes
    public function deletePayment(string $slNo): void
    {
        $lines = SupplierPayment::where('sl_no', $slNo)->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('Supplier payment not found.');
        }

        // an advance that an Adjustment payment already used can not go away first
        $advance = 0;
        foreach ($lines as $line) {
            if ($line->po_no == SupplierPayment::ADVANCE) {
                $advance += (float) $line->amount;
            }
        }
        if ($advance > 0 && $advance > $this->advanceBalance($lines->first()->supplier_id)) {
            throw new \RuntimeException('The advance of this payment is already adjusted. Delete the Adjustment payment first.');
        }

        DB::beginTransaction();
        try {
            foreach ($lines as $line) {
                $line->delete();
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
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
        $opening = 0;
        if ($supplier->opening_balance_type == '2') {
            $opening = (float) $supplier->opening_balance;
        }

        $paid = (float) SupplierPayment::where('supplier_id', $supplier->id)
            ->where('po_no', SupplierPayment::OPENING)
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

    // [purchase id => amount + discount paid against it]
    private function paidByPurchase(int $supplierId)
    {
        return SupplierPayment::where('supplier_id', $supplierId)
            ->whereNotNull('purchase_id')
            ->groupBy('purchase_id')
            ->pluck(DB::raw('SUM(amount + discount)'), 'purchase_id');
    }

    // [purchase id => returned amount]; a return the supplier did not pay back in cash lowers the PO due
    private function returnedByPurchase(int $supplierId)
    {
        return PurchaseReturn::where('supplier_id', $supplierId)
            ->where('is_refund', 0)
            ->groupBy('purchase_id')
            ->pluck(DB::raw('SUM(total_amount)'), 'purchase_id');
    }

    // company of the logged in user, null for a Super Admin
    private function ownCompanyId(): ?int
    {
        $user = Auth::user();
        if (!$user || $user->hasRole('Super Admin') || empty($user->company_id)) {
            return null;
        }

        return (int) $user->company_id;
    }
}
