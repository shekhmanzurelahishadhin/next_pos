<?php

namespace App\Http\Requests\purchase;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id' => 'required|integer|exists:companies,id',
            'purchase_date' => 'required|date',
            'cash_due' => 'required|string|max:50',
            'purchase_type' => 'required|string|max:50',
            'store_id' => 'required|integer',
            'ship_by' => 'required|string|max:100',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'payment_type' => 'required|string|max:50',
            'payment_amount' => 'nullable|numeric|min:0',
            'supplier_bill_no' => 'nullable|string|max:100',
            'status' => 'nullable|integer|in:0,1',

            'items' => 'required|array|min:1',
            'items.*.location_id' => 'required|integer',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.unit' => 'required|string|max:50',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.per_kg' => 'nullable|numeric|min:0',
            'items.*.sell_price' => 'required|numeric|min:0',
            'items.*.weight_unit' => 'nullable|string|max:20',
            'items.*.total_weight' => 'nullable|numeric|min:0',
            'items.*.total_weight_amount' => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'At least one purchase item is required.',
            'items.*.product_id.required' => 'Product is required for all items.',
            'items.*.qty.min' => 'Quantity must be at least 1.',
            'items.*.unit_price.min' => 'Unit price must be a positive number.',
        ];
    }
}
