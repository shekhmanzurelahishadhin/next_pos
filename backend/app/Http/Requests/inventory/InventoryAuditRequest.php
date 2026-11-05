<?php

namespace App\Http\Requests\inventory;

use Illuminate\Foundation\Http\FormRequest;

class InventoryAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'audit_name_id'          => ['required', 'exists:audit_names,id'],
            'store_id'               => ['required', 'exists:stores,id'],
            'location_id'            => ['required', 'exists:locations,id'],
            'remarks'                => ['nullable', 'string', 'max:255'],
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.barcode'        => ['required', 'string'],
            'items.*.physical_qty'   => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'audit_name_id.required' => 'Please select an audit name.',
            'store_id.required'      => 'Please select a store.',
            'location_id.required'   => 'Select location first!',
            'items.required'         => 'Please add at least one row.',
        ];
    }
}
