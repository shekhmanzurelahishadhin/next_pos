<?php

namespace App\Services\accounting;

use App\Models\accounting\ChartOfAc;
use App\Models\accounting\ChartOfAcOpening;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Chart Of AC Opening (parts_bazar accounting/chartOfAcOpening)
class ChartOfAcOpeningService
{
    public function __construct(private CurrencyConversionService $currencyService)
    {
    }

    // CA Head list, like parts_bazar caWithNoChild: heads with no child head, no main head
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

    // Manage Opening Amounts grid: CA Head (title or code), date, currency, created / updated by
    public function getList(array $filters, $perPage)
    {
        $query = ChartOfAcOpening::query()->with(['account:id,code,title', 'createdBy:id,name', 'updatedBy:id,name']);

        if (!empty($filters['ca_head'])) {
            $text = trim($filters['ca_head']);
            $query->whereHas('account', function ($account) use ($text) {
                // title or code, in one group so it stays inside this head
                $account->where(function ($inner) use ($text) {
                    $inner->where('title', 'like', '%' . $text . '%')->orWhere('code', 'like', '%' . $text . '%');
                });
            });
        }
        if (!empty($filters['opening_amount_date'])) {
            $query->where('opening_amount_date', 'like', '%' . trim($filters['opening_amount_date']) . '%');
        }
        if (!empty($filters['currency_id'])) {
            $query->where('currency_id', $filters['currency_id']);
        }
        if (!empty($filters['transaction_type'])) {
            $query->where('transaction_type', $filters['transaction_type']);
        }
        if (!empty($filters['created_by'])) {
            $query->where('created_by', $filters['created_by']);
        }
        if (!empty($filters['updated_by'])) {
            $query->where('updated_by', $filters['updated_by']);
        }

        // Dr / Cr totals in BDT of the filtered rows
        $drQuery = clone $query;
        $totalDr = $drQuery->where('transaction_type', ChartOfAcOpening::DEBIT)->sum('opening_amount');
        $crQuery = clone $query;
        $totalCr = $crQuery->where('transaction_type', ChartOfAcOpening::CREDIT)->sum('opening_amount');

        $query->orderByDesc('id');

        if (!$perPage) {
            $perPage = 20;
        }
        $rows = $query->paginate($perPage);

        return [
            'data' => $rows->items(),
            'total' => $rows->total(),
            'total_dr' => (float) $totalDr,
            'total_cr' => (float) $totalCr,
        ];
    }

    public function save(array $data, $opening = null)
    {
        // the CA Head must be a head with no child head and not a main head
        $account = ChartOfAc::find($data['ca_id']);
        if (!$account || $account->root == ChartOfAc::MAIN_ROOT) {
            throw new \RuntimeException('Please select a CA Head from the list.');
        }
        $hasChild = ChartOfAc::where('root', $account->id)->exists();
        if ($hasChild) {
            throw new \RuntimeException('A group head can not have an opening amount, select a head under it.');
        }

        // the rate is taken on the server for the date, like parts_bazar getAvailableConvertionRate
        $rate = $this->currencyService->rateOn($data['currency_id'], $data['opening_amount_date']);
        if ($rate <= 0) {
            throw new \RuntimeException('No conversion rate of this currency for the Opening Amount Date. Add it in Currency first.');
        }

        if (!$opening) {
            $opening = new ChartOfAcOpening();
            $opening->created_by = Auth::id();
        } else {
            $opening->updated_by = Auth::id();
        }
        $opening->ca_id = $account->id;
        $opening->transaction_type = $data['transaction_type'];
        $opening->opening_amount_date = $data['opening_amount_date'];
        $opening->currency_id = $data['currency_id'];
        $opening->conversion_rate = $rate;
        $opening->amount_in_foreign_currency = $data['amount_in_foreign_currency'];
        // Opening Amount (BDT) = conversion rate x Opening Amount (FC)
        $opening->opening_amount = round($rate * $data['amount_in_foreign_currency'], 2);
        $opening->save();

        return $opening;
    }

    public function delete(ChartOfAcOpening $opening)
    {
        $opening->delete();
    }
}
