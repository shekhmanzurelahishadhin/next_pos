<?php

namespace App\Http\Requests\softConfig\brand;

use Illuminate\Foundation\Http\FormRequest;

class CreateBrandRequest extends FormRequest
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
            'name' => 'required|string|max:255|unique:brands,name',
            'slug' => 'nullable|string|max:255|unique:brands,slug',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'The brand name is required.',
            'name.string' => 'The brand name must be a string.',
            'name.max' => 'The brand name cannot exceed 255 characters.',
            'name.unique' => 'This brand name already exists.',

            'slug.string' => 'The brand slug must be a string.',
            'slug.max' => 'The brand slug cannot exceed 255 characters.',
            'slug.unique' => 'This brand slug already exists.',
        ];
    }
}
