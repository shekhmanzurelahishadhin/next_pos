<?php

namespace App\Http\Requests\purchase;

use Illuminate\Foundation\Http\FormRequest;

class SupplierPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id'          => ['required', 'exists:suppliers,id'],
            'payment_date'         => ['required', 'date'],
            'payment_type'         => ['required', 'in:1,2,3,4,5'],
            'lot_amount'           => ['required', 'numeric', 'min:0'],
            'supplier_mr_no'       => ['nullable', 'string', 'max:255'],
            'bank_name'            => ['nullable', 'string', 'max:255'],
            'cheque_no'            => ['nullable', 'string', 'max:255'],
            'cheque_date'          => ['nullable', 'date'],
            'remarks'              => ['nullable', 'string', 'max:255'],
            'lines'                => ['nullable', 'array'],
            'lines.*.purchase_id'  => ['nullable', 'integer'],
            'lines.*.amount'       => ['nullable', 'numeric', 'min:0'],
            'lines.*.discount'     => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_date.required' => 'Date cannot be blank',
            'payment_type.required' => 'Payment Type cannot be blank',
            'lot_amount.required'   => 'Lot amount cannot be blank',
        ];
    }
}
