<?php

namespace App\Http\Requests\softConfig\productPrice;

use Illuminate\Foundation\Http\FormRequest;

class AddPurchasePriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'original_price' => ['required', 'numeric', 'min:0'],
            'vat_percent'    => ['nullable', 'numeric', 'min:0', 'max:100'],
            'purchase_price' => ['required', 'numeric', 'min:0'],
            'date'           => ['required', 'date'],
            'is_active'      => ['required', 'boolean'],
        ];
    }
}
