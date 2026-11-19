<?php

namespace App\Services\accounting;

use App\Models\accounting\CurrencyConversion;
use App\Models\softConfig\Lookup;
use Illuminate\Support\Facades\Auth;

// Currency conversion in BDT (parts_bazar accounting/currencyConvertionInBdt)
class CurrencyConversionService
{
    // currency list from the "currency" lookup: [code => name]
    public function currencies()
    {
        $rows = Lookup::where('type', CurrencyConversion::LOOKUP_TYPE)->where('status', 1)->orderBy('code')->get(['code', 'name']);
        $list = [];
        foreach ($rows as $row) {
            $list[] = ['value' => (string) $row->code, 'label' => $row->name];
        }
        return $list;
    }

    public function getList(array $filters)
    {
        $query = CurrencyConversion::query()->with(['createdBy:id,name', 'updatedBy:id,name']);

        if (!empty($filters['currency_id'])) {
            $query->where('currency_id', $filters['currency_id']);
        }

        return $query->orderByDesc('date_from')->orderByDesc('id')->get();
    }

    public function save(array $data, $conversion = null)
    {
        // two rates of one currency can not cover the same day, the rate of a date must be clear
        $overlap = CurrencyConversion::where('currency_id', $data['currency_id'])
            ->where('date_from', '<=', $data['date_to'])
            ->where('date_to', '>=', $data['date_from']);
        if ($conversion) {
            $overlap->where('id', '!=', $conversion->id);
        }
        if ($overlap->exists()) {
            throw new \RuntimeException('A rate of this currency already covers some of these dates.');
        }

        if (!$conversion) {
            $conversion = new CurrencyConversion();
            $conversion->created_by = Auth::id();
        } else {
            $conversion->updated_by = Auth::id();
        }
        $conversion->currency_id = $data['currency_id'];
        $conversion->date_from = $data['date_from'];
        $conversion->date_to = $data['date_to'];
        $conversion->amount_in_bdt = $data['amount_in_bdt'];
        $conversion->save();

        return $conversion;
    }

    public function delete(CurrencyConversion $conversion)
    {
        $conversion->delete();
    }

    // rate of the currency on the date, 0 when no rate covers it (parts_bazar getAvailableConvertionRate)
    public function rateOn($currencyId, $date)
    {
        $row = CurrencyConversion::where('currency_id', $currencyId)
            ->where('date_from', '<=', $date)
            ->where('date_to', '>=', $date)
            ->first();
        if ($row) {
            return (float) $row->amount_in_bdt;
        }
        return 0;
    }
}
