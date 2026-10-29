<?php

namespace App\Http\Requests\softConfig\scrollCode;

use App\Models\softConfig\ScrollCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScrollCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $type = $this->input('type');
        $keys = array_map('strval', array_keys(ScrollCode::KEYS[$type] ?? []));
        $max  = ScrollCode::MAX_LENGTH[$type] ?? 5;

        return [
            'type'  => ['required', Rule::in(array_keys(ScrollCode::KEYS))],
            'codes' => ['required', 'array', function ($attribute, $value, $fail) use ($keys) {
                // every item of this type must be sent, nothing else
                $sent = array_map('strval', array_keys($value));
                if (array_diff($keys, $sent) || array_diff($sent, $keys)) {
                    $fail('Codes are missing for some items.');
                }
            }],
            'codes.*' => ['required', 'string', "max:{$max}", 'alpha_num', 'distinct:ignore_case'],
        ];
    }

    public function messages(): array
    {
        return [
            'codes.*.required'  => 'Code is required.',
            'codes.*.distinct'  => 'Same code is used twice.',
            'codes.*.max'       => 'Code is too long.',
            'codes.*.alpha_num' => 'Only letters and numbers.',
        ];
    }
}
