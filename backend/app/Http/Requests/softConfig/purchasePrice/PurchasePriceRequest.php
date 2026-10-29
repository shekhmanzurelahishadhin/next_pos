<?php

namespace App\Http\Requests\softConfig\purchasePrice;

use Illuminate\Foundation\Http\FormRequest;

class PurchasePriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'po_no' => 'nullable|string|max:255',
            'product_id' => 'required|exists:products,id',
            'price' => 'required|numeric|min:0',
            'qty' => 'required|numeric|min:0',
            'month' => 'nullable|integer|between:1,12',
            'year' => 'nullable|integer|digits:4',
            'date' => 'nullable|date',
        ];

        // For update, make product_id optional
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $rules['product_id'] = 'nullable|exists:products,id';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'product_id.required' => 'Product is required',
            'product_id.exists' => 'Selected product does not exist',
            'price.required' => 'Price is required',
            'price.numeric' => 'Price must be a number',
            'price.min' => 'Price cannot be negative',
            'qty.required' => 'Quantity is required',
            'qty.numeric' => 'Quantity must be a number',
            'qty.min' => 'Quantity cannot be negative',
            'month.between' => 'Month must be between 1 and 12',
            'year.digits' => 'Year must be 4 digits',
            'date.date' => 'Invalid date format',
        ];
    }
}
