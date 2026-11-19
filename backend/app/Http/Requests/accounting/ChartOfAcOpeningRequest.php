<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// same required fields as parts_bazar ChartOfAcOpening::rules
class ChartOfAcOpeningRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ca_id'                      => ['required', 'integer'],
            'opening_amount_date'        => ['required', 'date'],
            'currency_id'                => ['required', 'integer', Rule::exists('lookups', 'code')->where('type', 'currency')],
            'transaction_type'           => ['required', 'in:3,4'],
            'amount_in_foreign_currency' => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'ca_id.required'                      => 'CA Head cannot be blank.',
            'opening_amount_date.required'        => 'Opening Amount Date cannot be blank.',
            'currency_id.required'                => 'Currency cannot be blank.',
            'transaction_type.required'           => 'Dr/Cr cannot be blank.',
            'amount_in_foreign_currency.required' => 'Opening Amount (FC) cannot be blank.',
            'amount_in_foreign_currency.gt'       => 'Opening Amount (FC) must be more than 0.',
        ];
    }
}
