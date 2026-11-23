<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;

class CostCenterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'cost_category_id' => ['required', 'integer', 'exists:cost_categories,id'],
            'title'            => ['required', 'string', 'max:255'],
            'code'             => ['nullable', 'string', 'max:100'],
        ];
        // status is only on the update form
        if ($this->isMethod('put')) {
            $rules['status'] = ['required', 'integer', 'in:1,2'];
        }
        return $rules;
    }

    public function messages(): array
    {
        return [
            'cost_category_id.required' => 'Cost Category cannot be blank.',
            'title.required'            => 'Title cannot be blank.',
            'title.max'                 => 'Title is too long (maximum is 255 characters).',
            'code.max'                  => 'Code is too long (maximum is 100 characters).',
            'status.required'           => 'Status cannot be blank.',
        ];
    }
}
