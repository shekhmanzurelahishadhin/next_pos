<?php

namespace App\Http\Requests\users;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
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
        $userId = $this->route('user')->id ?? null; // get current user id from route

        return [
            'name' => 'required|string|max:255|unique:users,name,' . $userId,
            'email' => 'required|string|email|max:255|unique:users,email,' . $userId,
            'password' => 'nullable|string|min:8|confirmed',
            'password_confirmation' => 'nullable|required_with:password',
            'company_id' => 'required|integer',
            'roles' => 'required|array',
            'roles.*' => 'integer|exists:roles,id',
        ];
    }

    /**
     * Custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Name is required.',
            'name.string' => 'Name must be a valid string.',
            'name.max' => 'Name may not be greater than 255 characters.',
            'name.unique' => 'This name has already been taken.',

            'email.required' => 'Email is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.max' => 'Email may not be greater than 255 characters.',
            'email.unique' => 'This email is already registered.',

            'company_id.required' => 'Company is required.',
            'company_id.integer' => 'Enter valid company.',

            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
            'password_confirmation.required_with' => 'Password confirmation is required when updating password.',


            'roles.required' => 'At least one role must be selected.',
            'roles.array' => 'Roles must be an array.',
            'roles.*.integer' => 'Each role must be a valid integer ID.',
            'roles.*.exists' => 'Selected role does not exist.',
        ];
    }
}
