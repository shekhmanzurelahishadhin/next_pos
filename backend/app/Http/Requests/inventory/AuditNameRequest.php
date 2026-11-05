<?php

namespace App\Http\Requests\inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AuditNameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'audit_name' => ['required', 'string', 'max:255', Rule::unique('audit_names', 'audit_name')->ignore($this->route('auditName'))],
            'from_date'  => ['required', 'date'],
            'to_date'    => ['required', 'date', 'after_or_equal:from_date'],
            'status'     => ['required', 'in:0,1'],
        ];
    }

    public function messages(): array
    {
        return [
            'audit_name.unique'      => 'This audit name is already used.',
            'to_date.after_or_equal' => 'To Date can not be before From Date.',
        ];
    }
}
