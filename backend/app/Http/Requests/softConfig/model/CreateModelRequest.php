<?php

namespace App\Http\Requests\softConfig\model;

use Illuminate\Foundation\Http\FormRequest;

class CreateModelRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'brand_id' => 'required|exists:brands,id',
            'category_id' => 'required|exists:categories,id',
            'sub_category_id' => 'required|exists:sub_categories,id',
            'name' => 'required|string|max:255|unique:product_models,name',
            'slug' => 'nullable|string|max:255',
        ];
    }
    public function messages(): array
    {
        return [
            'brand_id.required' => 'Please select a brand.',
            'brand_id.exists' => 'The selected brand is invalid.',

            'category_id.required' => 'Please select a category.',
            'category_id.exists' => 'The selected category is invalid.',

            'sub_category_id.required' => 'Please select a sub-category.',
            'sub_category_id.exists' => 'The selected sub-category is invalid.',

            'name.required' => 'Model name is required.',
            'name.unique' => 'This model name already exists.',
            'name.max' => 'Model name cannot be longer than 255 characters.',

            'slug.max' => 'Slug cannot be longer than 255 characters.',
        ];
    }

}
