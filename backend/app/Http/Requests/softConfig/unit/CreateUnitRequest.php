<?php

namespace App\Http\Requests\softConfig\unit;

use Illuminate\Foundation\Http\FormRequest;

class CreateUnitRequest extends FormRequest
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
            'name' => 'required|string|max:255|unique:units,name',
            'slug' => 'nullable|string|max:255|unique:units,slug',
            'code' => 'required|string|max:50|unique:units,code',
        ];
    }
    public function messages(): array
    {
        return [
            'name.required' => 'The unit name is required.',
            'name.string' => 'The unit name must be a string.',
            'name.max' => 'The unit name cannot exceed 255 characters.',
            'name.unique' => 'This unit name already exists.',

            'slug.unique' => 'The slug has already been taken.',

            'code.required' => 'The unit code is required.',
            'code.string' => 'The unit code must be a string.',
            'code.max' => 'The unit code cannot exceed 50 characters.',
            'code.unique' => 'This unit code already exists.',
        ];
    }
}
