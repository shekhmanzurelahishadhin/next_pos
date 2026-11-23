<?php

namespace App\Services\accounting;

use App\Models\accounting\ChequeBook;
use App\Models\accounting\ChequeEntry;
use Illuminate\Support\Facades\Auth;

// Cheque Entry register (parts_bazar chequebook/chequeEntry): the rows come from the vouchers,
// the page shows them, prints a cheque and sets the clearance date
class ChequeEntryService
{
    public function getList(array $filters, $perPage, $page)
    {
        $query = ChequeEntry::query()->with(['bank:id,title']);

        if (!empty($filters['max_sl'])) {
            $query->where('max_sl', $filters['max_sl']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('entry_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('entry_date', '<=', $filters['date_to']);
        }
        if (!empty($filters['cb_bank_id'])) {
            $query->where('cb_bank_id', $filters['cb_bank_id']);
        }
        if (!empty($filters['payment_type'])) {
            $query->where('payment_type', $filters['payment_type']);
        }
        if (!empty($filters['payment_name'])) {
            $query->where('payment_name', 'like', '%' . $filters['payment_name'] . '%');
        }
        if (!empty($filters['cheque_no'])) {
            $query->where('cheque_no', 'like', '%' . $filters['cheque_no'] . '%');
        }
        if (!empty($filters['note'])) {
            $query->where('note', 'like', '%' . $filters['note'] . '%');
        }
        if (!empty($filters['clearance'])) {
            if ($filters['clearance'] == 'cleared') {
                $query->whereNotNull('clearance_date');
            } else {
                $query->whereNull('clearance_date');
            }
        }

        $result = $query->orderByDesc('id')->paginate($perPage, ['*'], 'page', $page);

        return ['data' => $result->items(), 'total' => $result->total()];
    }

    // like parts_bazar, the clearance date is set once (the button hides after that)
    public function setClearance(ChequeEntry $entry, $date)
    {
        if ($entry->clearance_date) {
            throw new \RuntimeException('Clearance date of this cheque is already set.');
        }
        $entry->clearance_date = $date;
        $entry->updated_by = Auth::id();
        $entry->save();

        return $entry;
    }

    // ---------- called by the voucher ----------

    // a Bank Payment / Contra voucher wrote this cheque: the leaf becomes USED and a register row is added
    public function useCheque(ChequeBook $leaf, array $voucher)
    {
        $leaf->status = ChequeBook::CLEARED;
        $leaf->used_by = Auth::id();
        $leaf->used_date = now();
        $leaf->used_type = ChequeBook::JOURNAL;
        $leaf->journal_type = $voucher['voucher_type'];
        $leaf->journal_no = $voucher['entry_no'];
        $leaf->amount = $voucher['amount'];
        $leaf->save();

        $maxSl = (int) ChequeEntry::max('max_sl');

        $entry = new ChequeEntry();
        $entry->max_sl = $maxSl + 1;
        $entry->entry_date = $voucher['entry_date'];
        $entry->cb_bank_id = $leaf->bank_id;
        $entry->cheque_book_id = $leaf->id;
        $entry->payment_type = $voucher['payment_type'];
        $entry->payment_name = $voucher['pay_to'];
        $entry->cheque_no = $leaf->cheque_no;
        $entry->cheque_book_no = $leaf->book_no;
        $entry->cheque_date = $voucher['cheque_date'];
        $entry->amount = $voucher['amount'];
        $entry->note = $voucher['narration'];
        $entry->voucher_type = $voucher['voucher_type'];
        $entry->entry_no = $voucher['entry_no'];
        $entry->created_by = Auth::id();
        $entry->save();

        return $entry;
    }

    // the voucher no longer writes this cheque (voucher deleted, or another cheque picked):
    // the register row goes and the leaf is ACTIVE again, unless it was canceled
    public function freeCheque($voucherType, $entryNo)
    {
        $entries = ChequeEntry::where('voucher_type', $voucherType)->where('entry_no', $entryNo)->get();
        foreach ($entries as $entry) {
            if ($entry->cheque_book_id) {
                $leaf = ChequeBook::find($entry->cheque_book_id);
                if ($leaf && $leaf->status == ChequeBook::CLEARED) {
                    $leaf->status = ChequeBook::ACTIVE;
                    $leaf->used_by = null;
                    $leaf->used_date = null;
                    $leaf->used_type = null;
                    $leaf->journal_type = null;
                    $leaf->journal_no = null;
                    $leaf->amount = null;
                    $leaf->save();
                }
            }
            $entry->delete();
        }
    }
}
