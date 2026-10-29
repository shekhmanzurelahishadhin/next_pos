<?php

namespace App\Http\Requests\softConfig\product;

use Illuminate\Foundation\Http\FormRequest;

class CreateProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Required relations
            'product_category_id' => 'required|exists:categories,id',
            'sub_category_id'     => 'nullable|exists:sub_categories,id',
            'brand_id'            => 'required|exists:brands,id',
            'unit_id'             => 'nullable|exists:units,id',
            'company_id'          => 'nullable|exists:companies,id',
            'vehicle_brand_id'    => 'nullable|exists:lookups,id',
            'country_id'          => 'nullable|exists:lookups,id',

            // Basic product info
            'name'                => 'required|string|max:255',
            'part_number'         => 'required|string|max:255|unique:products,part_number',

            // Inventory
            'alert_qty'           => 'nullable|integer|min:0',
            'short_list_qty'      => 'nullable|numeric|min:0',

            // Specifications
            'unit_weight'         => 'nullable|string|max:100',
            'model'               => 'nullable|string|max:255',
            'model_year'          => 'nullable|string|max:50',
            'engine'              => 'nullable|string|max:255',
            'chassis'             => 'nullable|string|max:255',

            'min_order_qty'       => 'nullable|numeric|min:0',
            'manufacturer_id'     => 'nullable|exists:lookups,id',
            'color_id'            => 'nullable|exists:lookups,id',
            'size_id'             => 'nullable|exists:lookups,id',
            'warranty'            => 'nullable|string|max:255',
            'features'            => 'nullable|string|max:2000',
            'supported_models'    => 'nullable|string|max:2000',
            'year_models'         => 'nullable|string|max:255',

            // Status
            'status'              => 'nullable|in:0,1',
        ];
    }

    public function messages(): array
    {
        return [
            'product_category_id.required' => 'Please select a product category.',
            'product_category_id.exists'   => 'Selected product category is invalid.',

            'brand_id.required'            => 'Please select a brand.',
            'brand_id.exists'              => 'Selected brand is invalid.',

            'name.required'                => 'Product name is required.',
            'part_number.required'         => 'Part number is required.',
            'part_number.unique'           => 'This part number already exists.',

            'alert_qty.integer'             => 'Alert quantity must be an integer.',
            'short_list_qty.numeric'        => 'Short list quantity must be numeric.',

            'status.in'                     => 'Status must be Active or Inactive.',
        ];
    }
}
