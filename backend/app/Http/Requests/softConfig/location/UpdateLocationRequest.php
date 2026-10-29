<?php

namespace App\Http\Requests\softConfig\location;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLocationRequest extends FormRequest
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
        // Get the ID of the location being updated
        $locationId = $this->route('location'); // assumes route parameter is {location}

        return [
            'store_id' => 'required|exists:stores,id',
            'name' => [
                'required',
                'string',
                'max:255',
                // same name can be used in different stores
                Rule::unique('locations', 'name')->where('store_id', $this->store_id)->ignore($locationId),
            ],
            'description' => 'nullable|string',
            'status' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'company_id.required' => 'Please select a company.',
            'company_id.exists' => 'The selected company is invalid.',

            'store_id.required' => 'Please select a store.',
            'store_id.exists' => 'The selected store is invalid.',

            'name.required' => 'Location name is required.',
            'name.unique' => 'This location already exists in the selected store.',
            'name.max' => 'Location name cannot be longer than 255 characters.',
            'description.string' => 'The description must be valid text.',
            'status.boolean' => 'The active status must be true or false.',
        ];
    }
}
