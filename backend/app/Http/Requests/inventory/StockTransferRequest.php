<?php

namespace App\Http\Requests\inventory;

use Illuminate\Foundation\Http\FormRequest;

class StockTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'transfer_date'          => ['required', 'date'],
            'company_id'             => ['required', 'exists:companies,id'],
            'remarks'                => ['nullable', 'string', 'max:255'],
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.barcode'        => ['required', 'string'],
            'items.*.to_store_id'    => ['required', 'exists:stores,id'],
            'items.*.to_location_id' => ['required', 'exists:locations,id'],
            'items.*.transfer_qty'   => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'transfer_date.required'          => 'Please Select Transfer date',
            'company_id.required'             => 'Please Select Company First!',
            'items.required'                  => 'Sorry! No Data in Grid.',
            'items.*.to_store_id.required'    => 'Please Select Transfer To Store',
            'items.*.to_location_id.required' => 'Please Select To Location',
            'items.*.transfer_qty.required'   => 'Please Enter Transfer Qty',
            'items.*.transfer_qty.gt'         => 'Please Enter Transfer Qty',
        ];
    }
}
