<?php

namespace App\Http\Requests\softConfig\store;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStoreRequest extends FormRequest
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
        $storeId = $this->route('store')->id;

        return [
            'company_id' => 'required|exists:companies,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:stores,slug,' . $storeId,
            'code' => 'nullable|string|max:50|unique:stores,code,' . $storeId,
            'address' => 'nullable|string|max:500',
            'status' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'company_id.required' => 'The company field is required.',
            'company_id.exists'   => 'The selected company is invalid.',
            'name.required' => 'The store name is required.',
            'name.string'   => 'The store name must be a valid string.',
            'name.max'      => 'The store name cannot exceed 255 characters.',

            'slug.unique'   => 'This store slug is already in use.',
            'slug.max'      => 'The slug cannot exceed 255 characters.',

            'code.unique'   => 'This store code is already taken.',
            'code.max'      => 'The store code cannot exceed 50 characters.',


            'address.max'   => 'The address cannot exceed 500 characters.',

            'status.boolean' => 'The active status must be true or false.',
        ];
    }
}
