<?php

namespace App\Http\Requests\softConfig\productPrice;

use Illuminate\Foundation\Http\FormRequest;

class AddSellPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sell_price'   => ['required', 'numeric', 'min:0'],
            'market_price' => ['nullable', 'numeric', 'min:0'],
            'discount'     => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active'    => ['required', 'boolean'],
        ];
    }
}
