<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChartOfAcRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'root'        => ['required', 'integer'],
            'code'        => ['required', 'string', 'max:255', Rule::unique('chart_of_acs', 'code')->ignore($this->route('chartOfAc'))],
            'manual_code' => ['nullable', 'string', 'max:255'],
            'title'       => ['required', 'string', 'max:255'],
            'head_type'   => ['nullable', 'in:0,1'],
            'dep'         => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'root.required' => 'error! Please select Head Title',
            'code.unique'   => 'This code is already used.',
        ];
    }
}
