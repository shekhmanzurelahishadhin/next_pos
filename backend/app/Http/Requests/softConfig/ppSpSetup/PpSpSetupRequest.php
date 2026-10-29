<?php

namespace App\Http\Requests\softConfig\ppSpSetup;

use Illuminate\Foundation\Http\FormRequest;

class PpSpSetupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'    => 'required|in:1,2',
            'codes'   => 'required|array|size:10',
            'codes.*' => 'required|string|max:10|distinct',
            'status'  => 'nullable|in:0,1',
        ];
    }

    public function messages(): array
    {
        return [
            'type.required'     => 'Please select a type.',
            'codes.size'        => 'Codes are required for all 10 digits.',
            'codes.*.required'  => 'Code is required.',
            'codes.*.distinct'  => 'Same code is used twice.',
            'codes.*.max'       => 'Code cannot be longer than 10 characters.',
        ];
    }
}
