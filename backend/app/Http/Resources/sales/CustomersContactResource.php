<?php

namespace App\Http\Resources\sales;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomersContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'district' => $this->district,
            'customer_name' => $this->customer_name,
            'contact_one' => $this->contact_one,
            'contact_two' => $this->contact_two,
            'contact_three' => $this->contact_three,
            'remarks' => $this->remarks,
            'company_id' => $this->company_id,
            'created_by' => $this->createdBy?->name,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
