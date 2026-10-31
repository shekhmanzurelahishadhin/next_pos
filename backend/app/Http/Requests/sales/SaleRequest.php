<?php

namespace App\Http\Requests\sales;

use Illuminate\Foundation\Http\FormRequest;

class SaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id'              => ['required', 'exists:companies,id'],
            'order_date'              => ['required', 'date'],
            'cash_due'                => ['required', 'in:1,2'],
            'memo_no'                 => ['nullable', 'string', 'max:255'],
            'customer_id'             => ['required', 'exists:customers,id'],
            'mobile_no'               => ['nullable', 'string', 'max:255'],
            'car_name'                => ['nullable', 'string', 'max:255'],
            'car_no'                  => ['nullable', 'string', 'max:255'],
            'due_limit_exceed_accept' => ['nullable', 'in:1,2'],
            'received_type'           => ['nullable', 'required_if:cash_due,1'],
            'received_amount'         => ['nullable', 'numeric', 'min:0', 'required_if:cash_due,1', 'gt:0'],
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.barcode'         => ['required', 'string', 'distinct'],
            'items.*.qty'             => ['required', 'numeric', 'gt:0'],
            'items.*.sell_price'      => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'order_date.required'         => 'Please Select Order Date!',
            'cash_due.required'           => 'Please Select Cash / Due!',
            'customer_id.required'        => 'Please Select Customer!',
            'received_type.required_if'   => 'Please select a received type!',
            'received_amount.required_if' => 'Please add received amount!',
            'received_amount.gt'          => 'Please add received amount!',
            'items.required'              => 'Please add at least one Item!',
            'items.*.barcode.distinct'    => 'This barcode is already added in the grid!.',
            'items.*.qty.gt'              => 'Please Insert Qty!',
            'items.*.sell_price.required' => 'Please Insert Sell Price',
        ];
    }

    // received amount only matters for a cash sale
    protected function prepareForValidation(): void
    {
        if ($this->input('cash_due') == '2') {
            $this->merge(['received_amount' => null, 'received_type' => null]);
        }
    }
}
