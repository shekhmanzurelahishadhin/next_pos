<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;

class VoucherTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    // same as parts_bazar: format is required, max 255
    public function rules(): array
    {
        return [
            'type_format' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'type_format.required' => 'Format cannot be blank.',
            'type_format.max'      => 'Format is too long (maximum is 255 characters).',
        ];
    }
}
