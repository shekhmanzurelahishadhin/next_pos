<?php

namespace App\Http\Requests\inventory;

use Illuminate\Foundation\Http\FormRequest;

// parts_bazar Inventory createScenario: store, location, date, product, purchase price and qty are required;
// a stock out needs the barcode instead (store, location, product and price come from it)
class ManualStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'type'             => ['required', 'in:in,out'],
            'transaction_date' => ['required', 'date'],
            'qty'              => ['required', 'numeric', 'gt:0'],
            'remarks'          => ['nullable', 'string', 'max:255'],
        ];
        if ($this->input('type') == 'out') {
            $rules['barcode'] = ['required', 'string'];
        } else {
            $rules['store_id'] = ['required', 'integer', 'exists:stores,id'];
            $rules['location_id'] = ['required', 'integer', 'exists:locations,id'];
            $rules['product_id'] = ['required', 'integer', 'exists:products,id'];
            $rules['purchase_price'] = ['required', 'numeric', 'gt:0'];
        }
        return $rules;
    }

    public function messages(): array
    {
        return [
            'store_id.required'         => 'Store cannot be blank.',
            'location_id.required'      => 'Location cannot be blank.',
            'product_id.required'       => 'Product cannot be blank.',
            'barcode.required'          => 'Barcode cannot be blank.',
            'transaction_date.required' => 'Date cannot be blank.',
            'purchase_price.required'   => 'Purchase Price cannot be blank.',
            'purchase_price.gt'         => 'Purchase Price must be greater than 0.',
            'qty.required'              => 'Stock In cannot be blank.',
            'qty.gt'                    => 'Invalid Stock In',
        ];
    }
}
