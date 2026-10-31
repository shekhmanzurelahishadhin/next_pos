<?php

namespace App\Http\Requests\sales;

use Illuminate\Foundation\Http\FormRequest;

class SaleReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sale_id'                => ['required', 'exists:sales,id'],
            'return_date'            => ['required', 'date'],
            'is_refund'              => ['nullable', 'boolean'],
            'remarks'                => ['nullable', 'string', 'max:255'],
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.sale_detail_id' => ['required', 'integer'],
            'items.*.return_qty'     => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'return_date.required'       => 'Please select return date!',
            'items.*.return_qty.integer' => 'Return qty must be a whole number.',
        ];
    }
}
