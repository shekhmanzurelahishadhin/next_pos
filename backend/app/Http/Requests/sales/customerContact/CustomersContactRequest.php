<?php
namespace App\Http\Requests\sales\customerContact;

use Illuminate\Foundation\Http\FormRequest;

class CustomersContactRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'district'        => 'required|string|max:255',
            'customer_name'   => 'required|string|max:255',
            'contact_one'     => 'required|string|max:20',
            'contact_two'     => 'nullable|string|max:20',
            'contact_three'   => 'nullable|string|max:20',
            'remarks'         => 'nullable|string|max:1000',
        ];
    }

    public function messages()
    {
        return [
            'district.required'      => 'District is required.',
            'customer_name.required' => 'Name is required.',
            'contact_one.required'   => 'At least one contact number is required.',
            'contact_one.max'        => 'Contact number cannot be longer than 20 characters.',
            'contact_two.max'        => 'Contact number cannot be longer than 20 characters.',
            'contact_three.max'      => 'Contact number cannot be longer than 20 characters.',
        ];
    }
}
