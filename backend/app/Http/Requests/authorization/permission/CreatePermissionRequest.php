<?php

namespace App\Http\Requests\authorization\permission;

use Illuminate\Foundation\Http\FormRequest;

class CreatePermissionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'      => 'required|string|max:255|unique:permissions,name,' . $this->route('permission'),
            'module_id' => 'required|exists:modules,id',
            'menu_id'   => 'nullable|exists:menus,id',
            'sub_menu_id' => 'nullable|exists:sub_menus,id',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'      => 'Permission name is required.',
            'name.unique'        => 'This permission already exists.',
            'name.string'        => 'Permission name must be text.',
            'name.max'           => 'Permission name cannot be longer than 255 characters.',

            'module_id.required' => 'Module is required.',
            'module_id.exists'   => 'Selected module does not exist.',

            'menu_id.exists'     => 'Selected menu does not exist.',

            'sub_menu_id.exists' => 'Selected sub menu does not exist.',
        ];
    }

}
