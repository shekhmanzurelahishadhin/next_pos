<?php

namespace App\Http\Requests\accounting;

use App\Models\accounting\JournalEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id'     => ['required', 'exists:companies,id'],
            'voucher_type'   => ['required', 'integer', 'exists:voucher_types,id'],
            'entry_date'     => ['required', 'date'],
            'currency_id'    => ['required', 'integer', Rule::exists('lookups', 'code')->where('type', 'currency')],
            'narration'      => ['nullable', 'string', 'max:512'],
            'bill_no'        => ['nullable', 'string', 'max:255'],
            'chalan_no'      => ['nullable', 'string', 'max:255'],
            'cheque_no'      => ['nullable', 'string', 'max:255'],
            'cheque_date'    => ['nullable', 'date'],
            'cheque_id'      => ['nullable', 'integer'], // a leaf of the Cheque Book
            'payment_type'   => ['nullable', 'integer', 'in:1,2,3'],
            'pay_to'         => ['nullable', 'string', 'max:255'],

            'lines'                    => ['required', 'array', 'min:1'],
            'lines.*.ca_id'            => ['required', 'integer'],
            'lines.*.transaction_type' => ['required', 'integer', Rule::in([JournalEntry::DEBIT, JournalEntry::CREDIT])],
            'lines.*.amount'           => ['required', 'numeric', 'gt:0'],
            'lines.*.cost_center_id'   => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'company_id.required'   => 'Company cannot be blank.',
            'entry_date.required'   => 'Entry Date cannot be blank.',
            'currency_id.required'  => 'Currency cannot be blank.',
            'lines.required'        => 'Please add journal entries to the list!',
            'lines.min'             => 'Please add journal entries to the list!',
            'lines.*.amount.gt'     => 'Please Input Amount!',
            'lines.*.ca_id.required' => 'Please select an account title!',
        ];
    }
}
