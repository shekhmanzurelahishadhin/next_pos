<?php

namespace App\Http\Requests\sales;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSaleDetailRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'sometimes|exists:products,id',
            'quantity' => 'sometimes|integer|min:1',
            'price' => 'sometimes|numeric|min:0',
            'discount' => 'sometimes|numeric|min:0',
        ];
    }
}
