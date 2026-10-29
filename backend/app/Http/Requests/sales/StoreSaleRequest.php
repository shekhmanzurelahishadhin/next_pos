<?php

namespace App\Http\Requests\sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            //'max_sl_no' => 'required|integer',
            //'company_sl_no' => 'required|integer',
            'so_no' => 'nullable|string|unique:sales,so_no',
            'order_date' => 'required|date',
            'company_id' => 'required|exists:companies,id',
            'memo_no' => 'nullable|string',
            'customer_due' => 'nullable|string',
            'due_limit_exceed_accept' => 'required|in:Yes,No',
            'customer_id' => 'required|string',
            'car_name_model' => 'nullable|string|max:255',
            'car_no' => 'nullable|string|max:50',
            'grand_total' => 'required|numeric|min:0',
            'overall_discount' => 'required|numeric|min:0',
            'vat_percentage' => 'required|numeric|min:0|max:100',
            'received_type' => 'required|in:Cash,Card,Bank Transfer,Credit,Other',
            'received_amount' => 'required|numeric|min:0',

            'details' => 'sometimes|array',
            'details.*.product_id' => 'required|exists:products,id',
            'details.*.store_id' => 'nullable|string',
            'details.*.location_id' => 'nullable|string',
            'details.*.barcode_no' => 'nullable|string',
            'details.*.unit_id' => 'nullable|string',
            'details.*.price_price' => 'required|numeric|min:0',
            'details.*.quantity' => 'required|integer|min:1',
            'details.*.price' => 'required|numeric|min:0',
            'details.*.discount' => 'required|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'so_no.unique' => 'This Sales Order number already exists.',
            'company_id.exists' => 'Selected company does not exist.',
            'details.*.product_id.exists' => 'Selected product does not exist.',
        ];
    }
}
