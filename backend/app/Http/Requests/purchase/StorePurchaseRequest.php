<?php

namespace App\Http\Requests\purchase;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
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
            'cash_due' => 'required|string|in:cash,due',
            'purchase_type' => 'required|string',
            'store_id' => 'required|integer|exists:stores,id',
            'ship_by' => 'required|string',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'payment_type' => 'required|string',
            'payment_amount' => 'required|numeric|min:0',
            'supplier_bill_no' => 'nullable|string|max:255',
            'grand_total' => 'required|numeric|min:0',
            'due_amount' => 'required|numeric|min:0',
            'status' => 'sometimes|integer|in:0,1',
            'full_paid' => 'sometimes|integer|in:0,1',

            // Don't allow manual setting of auto-generated fields
            'max_sl_no' => 'prohibited',
            'company_sl_no' => 'prohibited',
            'po_no' => 'prohibited',

            'details' => 'sometimes|array',
            'details.*.product_id' => 'required_with:details|integer|exists:products,id',
            'details.*.qty' => 'required_with:details|integer|min:1',
            'details.*.unit_price' => 'required_with:details|numeric|min:0',
            // ... other detail validations
        ];
    }

    public function messages(): array
    {
        return [
            'max_sl_no.prohibited' => 'max_sl_no is auto-generated and cannot be set manually',
            'company_sl_no.prohibited' => 'company_sl_no is auto-generated and cannot be set manually',
            'po_no.prohibited' => 'po_no is auto-generated and cannot be set manually',
        ];
    }
}
