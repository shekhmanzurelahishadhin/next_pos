<?php

namespace App\Http\Requests\purchase;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'purchase_id'                => ['required', 'exists:purchases,id'],
            'return_date'                => ['required', 'date'],
            'is_refund'                  => ['nullable', 'boolean'],
            'remarks'                    => ['nullable', 'string', 'max:255'],
            'items'                      => ['required', 'array', 'min:1'],
            'items.*.purchase_detail_id' => ['required', 'integer'],
            'items.*.return_qty'         => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'return_date.required'   => 'Please select return date!',
            'items.*.return_qty.integer' => 'Return qty must be a whole number.',
        ];
    }
}
