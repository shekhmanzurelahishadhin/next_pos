<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;

class CostCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:255'],
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
            'title.required'  => 'Title cannot be blank.',
            'title.max'       => 'Title is too long (maximum is 255 characters).',
            'status.required' => 'Status cannot be blank.',
        ];
    }
}
