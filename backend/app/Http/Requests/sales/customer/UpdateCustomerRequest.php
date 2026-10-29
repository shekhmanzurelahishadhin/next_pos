<?php

namespace App\Http\Requests\sales\customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
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
        $customerId = $this->route('id') ?? $this->route('customer');
        // adjust based on your route parameter (e.g. customer/{id})

        return [
            'company_id' => 'nullable|exists:companies,id',
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('customers', 'slug')->ignore($customerId),
            ],
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric|min:0',
            'opening_balance_type' => 'nullable',
            'customer_type_id' => 'nullable|exists:lookups,id',
            'store_id' => 'nullable|exists:stores,id',
            'credit_limit' => 'nullable|numeric|min:0',
            'car_name' => 'nullable|string|max:255',
            'fax' => 'nullable|string|max:50',
            'website' => 'nullable|string|max:255',
            'status' => 'required|boolean', // 1=Active, 0=Inactive
        ];
    }

    /**
     * Custom error messages (optional)
     */
    public function messages(): array
    {
        return [
            'company_id.required' => 'Company is required.',
            'company_id.exists' => 'Selected company does not exist.',
            'slug.string' => 'The customer slug must be a string.',
            'slug.max' => 'The customer slug cannot exceed 255 characters.',
            'slug.unique' => 'This customer slug already exists.',
            'name.required' => 'Supplier name is required.',
            'status.required' => 'Status is required.',
            'status.boolean' => 'Status must be true/false.',
        ];
    }
}
