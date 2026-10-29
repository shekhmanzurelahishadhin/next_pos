<?php

namespace App\Http\Requests\purchase\supplier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupplierRequest extends FormRequest
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
        $supplierId = $this->route('id') ?? $this->route('supplier');
        // adjust based on your route parameter (e.g. supplier/{id})

        return [
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('suppliers', 'slug')->ignore($supplierId),
            ],
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric|min:0',
            'opening_balance_type' => 'nullable',
            'status' => 'required|boolean', // 1=Active, 0=Inactive
        ];
    }

    /**
     * Custom error messages (optional)
     */
    public function messages(): array
    {
        return [
            'slug.string' => 'The supplier slug must be a string.',
            'slug.max' => 'The supplier slug cannot exceed 255 characters.',
            'slug.unique' => 'This supplier slug already exists.',
            'name.required' => 'Supplier name is required.',
            'status.required' => 'Status is required.',
            'status.boolean' => 'Status must be true/false.',
        ];
    }
}
