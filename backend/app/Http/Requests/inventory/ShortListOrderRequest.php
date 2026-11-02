<?php

namespace App\Http\Requests\inventory;

use Illuminate\Foundation\Http\FormRequest;

class ShortListOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.store_id'       => ['required', 'exists:stores,id'],
            'items.*.product_id'     => ['required', 'exists:products,id'],
            'items.*.code'           => ['nullable', 'string', 'max:255'],
            'items.*.stock_qty'      => ['nullable', 'numeric'],
            'items.*.purchase_price' => ['required', 'numeric', 'min:0'],
            'items.*.order_qty'      => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required'                  => 'Please Insert Item In List!',
            'items.*.purchase_price.required' => 'Please enter purchase price!',
            'items.*.order_qty.required'      => 'Please enter order qty!',
            'items.*.order_qty.gt'            => 'Please enter order qty!',
        ];
    }
}
