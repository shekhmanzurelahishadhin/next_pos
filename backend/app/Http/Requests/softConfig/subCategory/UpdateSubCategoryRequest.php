<?php

namespace App\Http\Requests\softConfig\subCategory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubCategoryRequest extends FormRequest
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
        $id = $this->route('subCategory'); // depends on route binding

        return [
            'category_id' => 'required|exists:categories,id',
            'name'        => 'required|string|max:255',
           // 'slug'        => 'nullable|string|max:255|unique:sub_categories,slug,' . $id,
            'slug'        => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('sub_categories', 'slug')
                    ->ignore($this->route('subCategory'))
                    ->where('category_id', $this->category_id),
            ],
            'status'      => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.required' => 'The category field is required.',
            'category_id.exists'   => 'The selected category is invalid.',
            'name.required'        => 'The sub category name is required.',
            'name.string'          => 'The sub category name must be a string.',
            'name.max'             => 'The sub category name must not exceed 255 characters.',
            'slug.unique'          => 'The slug has already been taken.',
            'status.boolean'       => 'The status must be true or false.',
        ];
    }
}
