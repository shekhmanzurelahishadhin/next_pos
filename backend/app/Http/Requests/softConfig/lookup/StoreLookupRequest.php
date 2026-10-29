<?php

namespace App\Http\Requests\softConfig\lookup;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLookupRequest extends FormRequest
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
        // Base rules
        $rules = [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('lookups', 'name')->where(function ($query) {
                    $query
                        ->where('type', $this->input('type_select'))
                        ->whereNull('deleted_at'); // ignore trash
                }),
            ],
            'is_new' => 'required'
        ];

        // Conditional rules
        if ($this->is_new == 1) {
            $rules['type_write'] = [
                'required',
                'string',
                'max:255',
                Rule::unique('lookups', 'type')
                    ->whereNull('deleted_at'), // ignore trash data
            ];
        } else {
            $rules['type_select'] = 'required';
        }

        return $rules;
    }

    public function messages()
    {
        return [
            'name.required' => 'The name field is required.',
            'is_new.required' => 'Please select type.',
            'type_write.required' => 'Please write type name.',
            'type_select.required' => 'Please select a type.',
            'type_select.exists' => 'Type select does not exist.',
        ];
    }
}
