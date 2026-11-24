<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;

// same rules as parts_bazar VoucherSignatorySetup
class VoucherSignatoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'voucher_type'   => ['required', 'integer', 'exists:voucher_types,id'],
            'signatory_name' => ['required', 'string', 'max:255'],
            'order_qty'      => ['required', 'integer', 'min:1'],
        ];
        // status is only on the update form
        if ($this->isMethod('put')) {
            $rules['status'] = ['required', 'integer', 'in:1,2'];
        }
        return $rules;
    }

    public function messages(): array
    {
        return [
            'voucher_type.required'   => 'Voucher Type cannot be blank.',
            'voucher_type.exists'     => 'Voucher Type is invalid.',
            'signatory_name.required' => 'Signatory Name cannot be blank.',
            'signatory_name.max'      => 'Signatory Name is too long (maximum is 255 characters).',
            'order_qty.required'      => 'Order cannot be blank.',
            'order_qty.integer'       => 'Order must be an integer.',
            'order_qty.min'           => 'Order quantity must be greater than zero.',
            'status.required'         => 'Status cannot be blank.',
        ];
    }
}
