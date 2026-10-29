<?php

namespace App\Http\Requests\softConfig\lookup;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLookupRequest extends FormRequest
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
        $lookup = $this->route('lookup');

        return [
            'name' => [
                'sometimes',
                'string',
                'min:1',
                'max:255',
                Rule::unique('lookups', 'name')
                    ->where('type', $lookup->type)
                    ->whereNull('deleted_at')
                    ->ignore($lookup->id),
            ],
            'status' => 'sometimes',
        ];
    }
    public function messages()
    {
        return [
            'name.required' => 'The name field is required.',
            'name.status' => 'Status is required.',
        ];
    }
}
