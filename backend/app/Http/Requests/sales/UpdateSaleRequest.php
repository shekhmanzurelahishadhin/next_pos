<?php

namespace App\Http\Requests\sales;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $saleId = $this->route('sales');

        return [
            'so_no' => [
                'nullable',
                'string',
                Rule::unique('sales')->ignore($saleId),
            ],
            'order_date' => 'sometimes|date',
            'company_id' => 'sometimes|exists:companies,id',
            'due_limit_exceed_accept' => 'sometimes|in:Yes,No',
            'customer_id' => 'sometimes|string',
            'memo_no' => 'sometimes|string',
            'car_name_model' => 'sometimes|string',
            'car_no' => 'sometimes|string',
            'grand_total' => 'sometimes|numeric|min:0',
            'overall_discount' => 'sometimes|numeric|min:0',
            'vat_percentage' => 'sometimes|numeric|min:0|max:100',
            'received_type' => 'sometimes|in:Cash,Card,Bank Transfer,Credit,Other',
            'received_amount' => 'sometimes|numeric|min:0',
        ];
    }
}
