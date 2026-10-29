<?php

namespace App\Http\Requests\softConfig\store;

use Illuminate\Foundation\Http\FormRequest;

class CreateStoreRequest extends FormRequest
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
            'company_id' => 'required|exists:companies,id',
            'name'        => 'required|string|max:255',
            'slug'        => 'nullable|string|max:255|unique:stores,slug',
            'code'         => 'nullable|string|max:50|unique:stores,code',
            'address' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'company_id.required' => 'The company field is required.',
            'company_id.exists'   => 'The selected company is invalid.',
            'name.required'        => 'The store name is required.',
            'name.string'          => 'The store name must be a string.',
            'name.max'             => 'The store name must not exceed 255 characters.',
            'slug.unique'          => 'The slug has already been taken.',

            'code.unique'   => 'This store code is already taken.',
            'code.max'      => 'The store code cannot exceed 50 characters.',

            'address.max'   => 'The address cannot exceed 500 characters.',
        ];
    }
}
