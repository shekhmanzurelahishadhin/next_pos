<?php

namespace App\Http\Requests\sales;

use Illuminate\Foundation\Http\FormRequest;

class MoneyReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id'        => ['required', 'exists:customers,id'],
            'receipt_date'       => ['required', 'date'],
            'received_type'      => ['required', 'in:1,2,3,4,5'],
            'lot_amount'         => ['required', 'numeric', 'min:0'],
            'bank_name'          => ['nullable', 'string', 'max:255'],
            'customer_bank_name' => ['nullable', 'string', 'max:255'],
            'cheque_no'          => ['nullable', 'string', 'max:255'],
            'cheque_date'        => ['nullable', 'date'],
            'remarks'            => ['nullable', 'string', 'max:255'],
            'lines'              => ['nullable', 'array'],
            'lines.*.sale_id'    => ['nullable', 'integer'],
            'lines.*.amount'     => ['nullable', 'numeric', 'min:0'],
            'lines.*.discount'   => ['nullable', 'numeric', 'min:0'],
            'lines.*.vds'        => ['nullable', 'numeric', 'min:0'],
            'lines.*.tds'        => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'receipt_date.required'  => 'Please select a Date',
            'received_type.required' => 'Please select a Receive Type',
            'lot_amount.required'    => 'Lot amount cannot be blank',
        ];
    }
}
