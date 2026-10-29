<?php

namespace App\Http\Requests\purchase;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'purchase_date' => 'sometimes|date',
            'cash_due' => 'sometimes|string|in:cash,due',
            'purchase_type' => 'sometimes|string',
            'store_id' => 'sometimes|integer|exists:stores,id',
            'ship_by' => 'sometimes|string',
            'supplier_id' => 'sometimes|integer|exists:suppliers,id',
            'payment_type' => 'sometimes|string',
            'payment_amount' => 'sometimes|numeric|min:0',
            'supplier_bill_no' => 'nullable|string|max:255',
            'grand_total' => 'sometimes|numeric|min:0',
            'due_amount' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|integer|in:0,1',
            'full_paid' => 'sometimes|integer|in:0,1',

            // Don't allow updating auto-generated fields
            'max_sl_no' => 'prohibited',
            'company_sl_no' => 'prohibited',
            'po_no' => 'prohibited',
            'company_id' => 'prohibited',

            'details' => 'sometimes|array',
            'details.*.product_id' => 'required_with:details|integer|exists:products,id',
            'details.*.qty' => 'required_with:details|integer|min:1',
            'details.*.unit_price' => 'required_with:details|numeric|min:0',
            // ... other detail validations
        ];
    }
}
