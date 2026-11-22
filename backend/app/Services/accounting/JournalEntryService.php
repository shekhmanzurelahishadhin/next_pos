<?php

namespace App\Services\accounting;

use App\Models\accounting\ChartOfAc;
use App\Models\accounting\JournalEntry;
use App\Models\accounting\VoucherType;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Voucher Entry (parts_bazar JournalEntryController journalEntrySave)
class JournalEntryService
{
    // voucher types that have Bill No and Chalan No on the form
    const BILL_TYPES = [VoucherType::JOURNAL, VoucherType::CASH_PAYMENT, VoucherType::BANK_PAYMENT];

    // voucher types that have the cheque fields on the form
    const CHEQUE_TYPES = [VoucherType::CONTRA, VoucherType::BANK_PAYMENT];

    public function __construct(private CurrencyConversionService $currencyService)
    {
    }

    // Account Title list: heads with no child head and not a main head (parts_bazar newCaWithNoChild2)
    public function headOptions()
    {
        $parentIds = DB::table('chart_of_acs')->where('root', '!=', ChartOfAc::MAIN_ROOT)->pluck('root')->all();

        $rows = ChartOfAc::where('root', '!=', ChartOfAc::MAIN_ROOT)
            ->whereNotIn('id', $parentIds)
            ->orderBy('title')
            ->get(['id', 'code', 'title']);

        $list = [];
        foreach ($rows as $row) {
            $list[] = ['value' => $row->id, 'label' => $row->title . ' (' . $row->code . ')'];
        }
        return $list;
    }

    // serial of the next voucher of this type in the month of the date (parts_bazar getTypeWiseMaxSlNo)
    public function nextSerial($voucherType, $date)
    {
        $time = strtotime($date);
        $maxSerial = JournalEntry::where('voucher_type', $voucherType)
            ->whereYear('entry_date', date('Y', $time))
            ->whereMonth('entry_date', date('m', $time))
            ->max('type_wise_max_sl_no');

        return (int) $maxSerial + 1;
    }

    // voucher no: 2 digit year + month + 3 digit serial, e.g. 2611001 (parts_bazar getFormattedNo)
    public function formattedNo($date, $serial)
    {
        $time = strtotime($date);
        return date('y', $time) . date('m', $time) . sprintf('%03d', $serial);
    }

    // the voucher no the next save will get, shown on the form
    public function nextVoucherNo($voucherType, $date)
    {
        $serial = $this->nextSerial($voucherType, $date);
        $entryNo = $this->formattedNo($date, $serial);
        return VoucherType::voucherNo($voucherType, $entryNo);
    }

    // Voucher Manage list (parts_bazar journalEntry/admin): one page holds whole vouchers,
    // every line of a voucher comes in the rows, the page merges the voucher columns
    public function getList(array $filters, $perPage, $page)
    {
        // the vouchers that match, newest first
        $vouchers = JournalEntry::query()
            ->selectRaw('voucher_type, entry_no, MAX(id) as last_id')
            ->groupBy('voucher_type', 'entry_no');

        if (!empty($filters['date_from'])) {
            $vouchers->where('entry_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $vouchers->where('entry_date', '<=', $filters['date_to']);
        }
        if (!empty($filters['voucher_type'])) {
            $vouchers->where('voucher_type', $filters['voucher_type']);
        }
        if (!empty($filters['voucher_no_from'])) {
            $vouchers->where('entry_no', '>=', trim($filters['voucher_no_from']));
        }
        if (!empty($filters['voucher_no_to'])) {
            $vouchers->where('entry_no', '<=', trim($filters['voucher_no_to']));
        }
        if (!empty($filters['entry_no'])) {
            $vouchers->where('entry_no', 'like', '%' . trim($filters['entry_no']) . '%');
        }
        if (!empty($filters['account'])) {
            $text = trim($filters['account']);
            $vouchers->whereHas('account', function ($account) use ($text) {
                $account->where(function ($inner) use ($text) {
                    $inner->where('title', 'like', '%' . $text . '%')->orWhere('code', 'like', '%' . $text . '%');
                });
            });
        }
        if (!empty($filters['narration'])) {
            $vouchers->where('narration', 'like', '%' . trim($filters['narration']) . '%');
        }
        if (!empty($filters['cheque_no'])) {
            $vouchers->where('cheque_no', 'like', '%' . trim($filters['cheque_no']) . '%');
        }
        if (!empty($filters['created_by'])) {
            $text = trim($filters['created_by']);
            $vouchers->whereHas('createdBy', function ($user) use ($text) {
                $user->where('name', 'like', '%' . $text . '%');
            });
        }

        $result = $vouchers->orderByDesc('last_id')->paginate($perPage, ['*'], 'page', $page);

        // every line of the vouchers on this page
        $rows = [];
        if (count($result->items()) > 0) {
            $lines = JournalEntry::query()
                ->with(['account:id,code,title', 'createdBy:id,name'])
                ->where(function ($query) use ($result) {
                    foreach ($result->items() as $voucher) {
                        $query->orWhere(function ($one) use ($voucher) {
                            $one->where('voucher_type', $voucher->voucher_type)->where('entry_no', $voucher->entry_no);
                        });
                    }
                })
                ->get();

            // the lines in the order of the vouchers, Dr lines first in a voucher
            $voucherTypes = VoucherType::pluck('type_format', 'id');
            foreach ($result->items() as $voucher) {
                foreach ([JournalEntry::DEBIT, JournalEntry::CREDIT] as $side) {
                    foreach ($lines as $line) {
                        if ($line->voucher_type != $voucher->voucher_type || $line->entry_no != $voucher->entry_no || $line->transaction_type != $side) {
                            continue;
                        }
                        $format = $voucherTypes[$line->voucher_type] ?? '';
                        $line->voucher_no = $format . '# ' . $line->entry_no;
                        $line->voucher_key = $line->voucher_type . '-' . $line->entry_no;
                        $rows[] = $line;
                    }
                }
            }
        }

        return ['data' => $rows, 'total' => $result->total()];
    }

    // all lines of one voucher, for the voucher preview
    public function findVoucher($voucherType, $entryNo)
    {
        $lines = JournalEntry::query()
            ->with(['account:id,code,title', 'createdBy:id,name'])
            ->where('voucher_type', $voucherType)
            ->where('entry_no', $entryNo)
            ->orderBy('transaction_type')
            ->orderBy('id')
            ->get();

        if ($lines->isEmpty()) {
            throw new \RuntimeException('No result found !');
        }

        $first = $lines->first();
        $type = VoucherType::find($voucherType);
        $company = DB::table('companies')->where('id', $first->company_id)->first(['id', 'name', 'address']);

        return [
            'voucher_type' => (int) $voucherType,
            'voucher_type_name' => $type ? $type->name . ' Voucher' : '',
            'voucher_no' => VoucherType::voucherNo($voucherType, $entryNo),
            'entry_no' => $entryNo,
            'entry_date' => $first->entry_date,
            'company' => $company,
            'currency_id' => $first->currency_id,
            'currency_conversion_rate' => $first->currency_conversion_rate,
            'narration' => $first->narration,
            'cheque_no' => $first->cheque_no,
            'cheque_date' => $first->cheque_date,
            'pay_to' => $first->pay_to,
            'payment_type' => $first->payment_type,
            'company_id' => $first->company_id,
            'entry_source_type' => $first->entry_source_type,
            'is_locked' => (bool) $first->is_locked,
            'bill_no' => $first->bill_no,
            'chalan_no' => $first->chalan_no,
            'created_by' => $first->createdBy,
            'created_at' => $first->created_at ? $first->created_at->format('Y-m-d H:i:s') : null,
            'lines' => $lines,
        ];
    }

    // delete the whole voucher (parts_bazar deleteByEntryNo): only a manual voucher that is not locked
    public function deleteVoucher($voucherType, $entryNo)
    {
        $lines = JournalEntry::where('voucher_type', $voucherType)->where('entry_no', $entryNo)->get();
        if ($lines->isEmpty()) {
            throw new \RuntimeException('No result found !');
        }
        foreach ($lines as $line) {
            if ($line->entry_source_type != JournalEntry::MANUAL) {
                throw new \RuntimeException('This voucher was made by the software from another entry, it can not be deleted here.');
            }
            if ($line->is_locked) {
                throw new \RuntimeException('This voucher is locked, it can not be deleted.');
            }
        }

        DB::transaction(function () use ($voucherType, $entryNo) {
            JournalEntry::where('voucher_type', $voucherType)->where('entry_no', $entryNo)->delete();
        });

        return VoucherType::voucherNo($voucherType, $entryNo);
    }

    // lock or unlock a voucher (parts_bazar lockJournal): a locked voucher can not be updated or deleted
    public function toggleLock($voucherType, $entryNo)
    {
        $first = JournalEntry::where('voucher_type', $voucherType)->where('entry_no', $entryNo)->first();
        if (!$first) {
            throw new \RuntimeException('No result found !');
        }
        if ($first->entry_source_type != JournalEntry::MANUAL) {
            throw new \RuntimeException('This voucher was made by the software from another entry, it can not be locked here.');
        }

        $lock = true;
        if ($first->is_locked) {
            $lock = false;
        }
        JournalEntry::where('voucher_type', $voucherType)->where('entry_no', $entryNo)->update([
            'is_locked' => $lock,
            'locked_by' => Auth::id(),
            'locked_at' => now(),
        ]);

        $voucherNo = VoucherType::voucherNo($voucherType, $entryNo);
        if ($lock) {
            return $voucherNo . ' locked';
        }
        return $voucherNo . ' unlocked';
    }

    // update a voucher (parts_bazar updateJournalVoucher): the old lines are replaced by the new lines,
    // the voucher type, voucher no, serial, created by and created time stay the same
    public function update($voucherType, $entryNo, array $data)
    {
        $oldFirst = JournalEntry::where('voucher_type', $voucherType)->where('entry_no', $entryNo)->first();
        if (!$oldFirst) {
            throw new \RuntimeException('No result found !');
        }
        if ($oldFirst->entry_source_type != JournalEntry::MANUAL) {
            throw new \RuntimeException('This voucher was made by the software from another entry, it can not be updated here.');
        }
        if ($oldFirst->is_locked) {
            throw new \RuntimeException('This voucher is locked, it can not be updated.');
        }

        $data['voucher_type'] = (int) $voucherType;
        return $this->save($data, $oldFirst);
    }

    // a new voucher, or the new lines of an old voucher when $oldFirst (a line of it) is given
    public function save(array $data, $oldFirst = null)
    {
        $voucherType = (int) $data['voucher_type'];

        // every line: a head from the list, no line twice, Dr and Cr totals the same
        $totalDr = 0;
        $totalCr = 0;
        $usedHeads = [];
        $accounts = [];
        foreach ($data['lines'] as $line) {
            $account = ChartOfAc::find($line['ca_id']);
            if (!$account || $account->root == ChartOfAc::MAIN_ROOT) {
                throw new \RuntimeException('Please select an account title!');
            }
            $hasChild = ChartOfAc::where('root', $account->id)->exists();
            if ($hasChild) {
                throw new \RuntimeException('A group head can not be used in a voucher (' . $account->title . ').');
            }
            if (in_array($account->id, $usedHeads)) {
                throw new \RuntimeException('Already added! (' . $account->title . ')');
            }
            $usedHeads[] = $account->id;
            $accounts[$account->id] = $account;

            if ($line['transaction_type'] == JournalEntry::DEBIT) {
                $totalDr = $totalDr + $line['amount'];
            } else {
                $totalCr = $totalCr + $line['amount'];
            }
        }
        if ($totalDr <= 0 || $totalCr <= 0) {
            throw new \RuntimeException('Please add journal entries to the list!');
        }
        if (round($totalDr, 2) != round($totalCr, 2)) {
            throw new \RuntimeException('Debit & Credit Balance is not equal!');
        }

        // the rate is taken on the server for the date, like the Opening
        $rate = $this->currencyService->rateOn($data['currency_id'], $data['entry_date']);
        if ($rate <= 0) {
            throw new \RuntimeException('No conversion rate of this currency for the Entry Date. Add it in Currency first.');
        }

        // Bill No and Chalan No only on Journal, Cash Payment and Bank Payment
        $billNo = null;
        $chalanNo = null;
        if (in_array($voucherType, self::BILL_TYPES)) {
            $billNo = $data['bill_no'] ?? null;
            $chalanNo = $data['chalan_no'] ?? null;
        }

        // cheque fields only on Contra and Bank Payment
        $chequeNo = null;
        $chequeDate = null;
        $paymentType = null;
        $payTo = null;
        if (in_array($voucherType, self::CHEQUE_TYPES)) {
            $chequeNo = $data['cheque_no'] ?? null;
            $chequeDate = $data['cheque_date'] ?? null;
            $paymentType = $data['payment_type'] ?? null;
            $payTo = $data['pay_to'] ?? null;
        }

        return DB::transaction(function () use ($data, $voucherType, $accounts, $rate, $billNo, $chalanNo, $chequeNo, $chequeDate, $paymentType, $payTo, $oldFirst) {
            // lock the rows of this type, so two saves at once can not get the same no
            JournalEntry::where('voucher_type', $voucherType)->lockForUpdate()->count();

            if ($oldFirst) {
                // update: the voucher keeps its no, serial and creator, the old lines go
                $serial = $oldFirst->type_wise_max_sl_no;
                $entryNo = $oldFirst->entry_no;
                $createdBy = $oldFirst->created_by;
                $createdAt = $oldFirst->created_at;
                $updatedBy = Auth::id();
                JournalEntry::where('voucher_type', $voucherType)->where('entry_no', $entryNo)->delete();
            } else {
                $serial = $this->nextSerial($voucherType, $data['entry_date']);
                $entryNo = $this->formattedNo($data['entry_date'], $serial);
                $createdBy = Auth::id();
                $createdAt = null;
                $updatedBy = null;
            }

            foreach ($data['lines'] as $line) {
                $account = $accounts[$line['ca_id']];

                $entry = new JournalEntry();
                $entry->company_id = $data['company_id'];
                $entry->voucher_type = $voucherType;
                $entry->type_wise_max_sl_no = $serial;
                $entry->entry_no = $entryNo;
                $entry->entry_date = $data['entry_date'];
                $entry->ca_id = $account->id;
                $entry->main_ca = $account->main_root_id;
                $entry->transaction_type = $line['transaction_type'];
                $entry->currency_id = $data['currency_id'];
                $entry->currency_conversion_rate = $rate;
                $entry->amount_in_foreign_currency = $line['amount'];
                // amount in BDT = amount x conversion rate
                $entry->amount = round($line['amount'] * $rate, 2);
                $entry->narration = $data['narration'] ?? null;
                $entry->bill_no = $billNo;
                $entry->chalan_no = $chalanNo;
                $entry->cheque_no = $chequeNo;
                $entry->cheque_date = $chequeDate;
                $entry->payment_type = $paymentType;
                $entry->pay_to = $payTo;
                $entry->entry_source_type = JournalEntry::MANUAL;
                $entry->created_by = $createdBy;
                $entry->updated_by = $updatedBy;
                if ($createdAt) {
                    $entry->created_at = $createdAt;
                }
                $entry->save();
            }

            return [
                'entry_no' => $entryNo,
                'voucher_no' => VoucherType::voucherNo($voucherType, $entryNo),
            ];
        });
    }
}
