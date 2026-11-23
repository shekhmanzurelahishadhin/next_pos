<?php

namespace App\Services\accounting;

use App\Models\accounting\ChartOfAc;
use App\Models\accounting\ChequeBook;
use App\Models\accounting\ChequeBookDeleteHistory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Cheque Book setup (parts_bazar accounting/chequeBook and chequeBookDeleteHistory)
class ChequeBookService
{
    // most leaves one book can add at once, so a typing mistake can not add a huge range
    const MAX_LEAVES = 1000;

    // the bank accounts: the heads right under Cash At Bank, like parts_bazar childDropdownList(BANK)
    public function bankOptions()
    {
        $rows = ChartOfAc::where('root', ChartOfAc::BANK)->orderBy('title')->get(['id', 'title']);
        $list = [];
        foreach ($rows as $row) {
            $list[] = ['value' => (string) $row->id, 'label' => $row->title];
        }
        return $list;
    }

    public function getList(array $filters, $perPage, $page)
    {
        $query = ChequeBook::query()->with(['bank:id,title', 'usedBy:id,name']);
        $this->applyFilters($query, $filters);

        // like parts_bazar: book_no DESC, cheque_no DESC, so the leaves of a book stay together
        $result = $query->orderByDesc('book_no')->orderBy('bank_id')->orderByDesc('cheque_no')->paginate($perPage, ['*'], 'page', $page);

        return ['data' => $result->items(), 'total' => $result->total()];
    }

    public function getHistory(array $filters, $perPage, $page)
    {
        $query = ChequeBookDeleteHistory::query()->with(['bank:id,title', 'createdBy:id,name']);
        $this->applyFilters($query, $filters);
        if (!empty($filters['remarks'])) {
            $query->where('remarks', 'like', '%' . $filters['remarks'] . '%');
        }

        $result = $query->orderByDesc('id')->paginate($perPage, ['*'], 'page', $page);

        return ['data' => $result->items(), 'total' => $result->total()];
    }

    private function applyFilters($query, array $filters)
    {
        if (!empty($filters['book_no'])) {
            $query->where('book_no', 'like', '%' . $filters['book_no'] . '%');
        }
        if (!empty($filters['bank_id'])) {
            $query->where('bank_id', $filters['bank_id']);
        }
        if (!empty($filters['branch_name'])) {
            $query->where('branch_name', 'like', '%' . $filters['branch_name'] . '%');
        }
        if (!empty($filters['cheque_no'])) {
            $query->where('cheque_no', 'like', '%' . $filters['cheque_no'] . '%');
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['used_type'])) {
            $query->where('used_type', $filters['used_type']);
        }
    }

    // add a book: one leaf for every number from "first" to "second" (parts_bazar actionCreate).
    // The numbers get leading zeros up to the longer of the two, "0001" to "100" gives 0001 ... 0100.
    // When one cheque no already exists nothing is added.
    public function createBook(array $data)
    {
        $first = (int) $data['first_number'];
        $second = (int) $data['second_number'];
        if ($second < $first) {
            throw new \RuntimeException('Cheque No To can not be less than Cheque No From.');
        }
        $count = $second - $first + 1;
        if ($count > self::MAX_LEAVES) {
            throw new \RuntimeException('One cheque book can have at most ' . self::MAX_LEAVES . ' leaves.');
        }
        $this->checkBank($data['bank_id']);

        $digits = strlen($data['first_number']);
        if (strlen($data['second_number']) > $digits) {
            $digits = strlen($data['second_number']);
        }

        $chequeNos = [];
        for ($number = $first; $number <= $second; $number++) {
            $chequeNos[] = $data['prefix'] . str_pad((string) $number, $digits, '0', STR_PAD_LEFT);
        }

        $exists = ChequeBook::whereIn('cheque_no', $chequeNos)->exists();
        if ($exists) {
            throw new \RuntimeException('Failed! Cheque No for this range already exists!');
        }

        DB::transaction(function () use ($data, $chequeNos) {
            foreach ($chequeNos as $chequeNo) {
                $leaf = new ChequeBook();
                $leaf->book_no = $data['book_no'];
                $leaf->bank_id = $data['bank_id'];
                $leaf->branch_name = $data['branch_name'] ?? null;
                $leaf->cheque_no = $chequeNo;
                $leaf->status = ChequeBook::ACTIVE;
                $leaf->created_by = Auth::id();
                $leaf->save();
            }
        });

        return count($chequeNos);
    }

    // like parts_bazar, only a canceled leaf can be updated
    public function updateLeaf(ChequeBook $leaf, array $data)
    {
        if ($leaf->status != ChequeBook::CANCELED) {
            throw new \RuntimeException('Only a canceled cheque can be updated.');
        }
        $this->checkBank($data['bank_id']);
        $taken = ChequeBook::where('cheque_no', $data['cheque_no'])->where('id', '!=', $leaf->id)->exists();
        if ($taken) {
            throw new \RuntimeException('Cheque No ' . $data['cheque_no'] . ' already exists.');
        }

        $leaf->book_no = $data['book_no'];
        $leaf->bank_id = $data['bank_id'];
        $leaf->branch_name = $data['branch_name'] ?? null;
        $leaf->cheque_no = $data['cheque_no'];
        $leaf->updated_by = Auth::id();
        $leaf->save();

        return $leaf;
    }

    // cancel one active leaf (parts_bazar actionDelete only sets the status)
    public function cancelLeaf(ChequeBook $leaf)
    {
        if ($leaf->status != ChequeBook::ACTIVE) {
            throw new \RuntimeException('Only an active cheque can be canceled.');
        }
        $leaf->status = ChequeBook::CANCELED;
        $leaf->updated_by = Auth::id();
        $leaf->save();

        return $leaf;
    }

    // delete a whole book (parts_bazar actionDeleteCheque): not when one leaf is used or canceled,
    // the leaves go to the delete history with the remarks
    public function deleteBook($bookNo, $bankId, $remarks)
    {
        $usedCount = ChequeBook::where('book_no', $bookNo)
            ->where('bank_id', $bankId)
            ->whereIn('status', [ChequeBook::CLEARED, ChequeBook::CANCELED])
            ->count();
        if ($usedCount > 0) {
            throw new \RuntimeException('Cheque(s) cannot be deleted because they are already used.');
        }

        $leaves = ChequeBook::where('book_no', $bookNo)->where('bank_id', $bankId)->where('status', ChequeBook::ACTIVE)->get();
        if ($leaves->isEmpty()) {
            throw new \RuntimeException('No cheques found for deletion.');
        }

        DB::transaction(function () use ($leaves, $remarks) {
            foreach ($leaves as $leaf) {
                $history = new ChequeBookDeleteHistory();
                $history->cheque_book_id = $leaf->id;
                $history->book_no = $leaf->book_no;
                $history->bank_id = $leaf->bank_id;
                $history->branch_name = $leaf->branch_name;
                $history->cheque_no = $leaf->cheque_no;
                $history->status = $leaf->status;
                $history->used_by = $leaf->used_by;
                $history->used_date = $leaf->used_date;
                $history->used_type = $leaf->used_type;
                $history->journal_type = $leaf->journal_type;
                $history->supplier_id = $leaf->supplier_id;
                $history->amount = $leaf->amount;
                $history->remarks = $remarks;
                $history->created_by = Auth::id();
                $history->save();

                $leaf->delete();
            }
        });

        return $leaves->count();
    }

    // the books of a bank that still have an active leaf, for the delete form
    public function activeBooks($bankId)
    {
        return ChequeBook::where('bank_id', $bankId)
            ->where('status', ChequeBook::ACTIVE)
            ->groupBy('book_no')
            ->orderBy('book_no')
            ->pluck('book_no')
            ->all();
    }

    // active leaves for the voucher cheque search (parts_bazar jquery_activeChequeNo)
    public function activeCheques(array $filters)
    {
        $query = ChequeBook::query()->with('bank:id,title')->where('status', ChequeBook::ACTIVE);
        if (!empty($filters['bank_id'])) {
            $query->where('bank_id', $filters['bank_id']);
        }
        if (!empty($filters['book_no'])) {
            $query->where('book_no', $filters['book_no']);
        }
        if (!empty($filters['cheque_no'])) {
            $query->where('cheque_no', 'like', '%' . $filters['cheque_no'] . '%');
        }

        $rows = $query->orderBy('cheque_no')->limit(500)->get();
        $list = [];
        foreach ($rows as $row) {
            $bankName = '';
            if ($row->bank) {
                $bankName = $row->bank->title;
            }
            $list[] = [
                'id' => $row->id,
                'cheque_no' => $row->cheque_no,
                'book_no' => $row->book_no,
                'bank_id' => $row->bank_id,
                'bank_name' => $bankName,
            ];
        }
        return $list;
    }

    private function checkBank($bankId)
    {
        $isBank = ChartOfAc::where('id', $bankId)->where('root', ChartOfAc::BANK)->exists();
        if (!$isBank) {
            throw new \RuntimeException('Bank Can not empty!');
        }
    }
}
