<?php

namespace App\Http\Requests\authorization\roles;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoleRequest extends FormRequest
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
    public function rules()
    {
        return [
            'name' => 'required|string|max:255|unique:roles,name,' . $this->route('role')->id,
            'guard_name' => 'nullable|string|max:255',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'Role name is required.',
            'name.string' => 'Role name must be a valid string.',
            'name.max' => 'Role name should not exceed 255 characters.',
            'name.unique' => 'This role already exists.',
            'guard_name.string' => 'Guard name must be a valid string.',
            'guard_name.max' => 'Guard name should not exceed 255 characters.',
        ];
    }
}
