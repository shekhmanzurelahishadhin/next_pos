<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CurrencyConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'currency_id'   => ['required', 'integer', Rule::exists('lookups', 'code')->where('type', 'currency')],
            'date_from'     => ['required', 'date'],
            'date_to'       => ['required', 'date', 'after_or_equal:date_from'],
            'amount_in_bdt' => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'currency_id.required'   => 'Currency cannot be blank.',
            'date_to.after_or_equal' => 'Date To can not be before Date From.',
            'amount_in_bdt.gt'       => 'Amount In BDT must be more than 0.',
        ];
    }
}
