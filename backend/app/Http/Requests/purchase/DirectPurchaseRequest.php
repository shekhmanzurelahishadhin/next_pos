<?php

namespace App\Http\Requests\purchase;

use Illuminate\Foundation\Http\FormRequest;

class DirectPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'purchase_date'        => 'required|date',
            'cash_due'             => 'required|in:1,2',
            'purchase_type'        => 'required|string',
            'store_id'             => 'required|exists:stores,id',
            'ship_by'              => 'nullable|string',
            'supplier_id'          => 'required|exists:suppliers,id',
            'payment_type'         => 'nullable|string',
            // cash purchase must have a payment
            'payment_amount'       => 'nullable|numeric|min:0|required_if:cash_due,1|gt:0',
            'supplier_bill_no'     => 'nullable|string|max:255',

            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'required|exists:products,id|distinct',
            'items.*.location_id'  => 'required|exists:locations,id',
            'items.*.qty'          => 'required|integer|min:1',
            'items.*.unit_price'   => 'required|numeric|min:0',
            'items.*.per_kg'       => 'nullable|numeric|min:0',
            'items.*.sell_price'   => 'nullable|numeric|min:0',
            'items.*.weight_unit'  => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'items.required'               => 'Please insert item in list!',
            'items.*.product_id.distinct'  => 'This item is already added in the grid!',
            'payment_amount.required_if'   => 'Please add payment amount!',
            'payment_amount.gt'            => 'Please add payment amount!',
            'supplier_id.required'         => 'Please select supplier!',
            'store_id.required'            => 'Please select store!',
        ];
    }

    // payment amount only matters for a cash purchase
    protected function prepareForValidation(): void
    {
        if ($this->input('cash_due') == '2') {
            $this->merge(['payment_amount' => null]);
        }
    }
}
