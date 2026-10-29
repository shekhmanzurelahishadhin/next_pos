<?php

namespace App\Http\Requests\softConfig\brand;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBrandRequest extends FormRequest
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
        $brandId = $this->route('brand')->id; // get current brand id

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('brands')->ignore($brandId),
            ],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('brands')->ignore($brandId),
            ],
            'status' => ['required', 'boolean'],
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

            'status.required' => 'The status field is required.',
            'status.boolean' => 'The status must be true or false.',
        ];
    }
}
