<?php

namespace App\Http\Requests\sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleDetailRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sale_id' => 'required|exists:sales,id',
            'product_id' => 'required|exists:products,id',
            'store_id' => 'nullable|string',
            'location_id' => 'nullable|string',
            'barcode_no' => 'nullable|string',
            'unit_id' => 'nullable|string',
            'price_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
            'discount' => 'required|numeric|min:0',
        ];
    }
}
