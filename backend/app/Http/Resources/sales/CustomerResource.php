<?php

namespace App\Http\Resources\sales;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'phone' => $this->phone,
            'email' => $this->email,
            'opening_balance_type' => (int) $this->opening_balance_type,
            'opening_type' => $this->balanceType?->name,
            'opening_balance' => $this->opening_balance,
            'company_id' => $this->company?->id ?? null,
            'company_name' => $this->company?->name ?? null,
            'slug' => $this->slug,
            'status' => $this->status,
            'address' => $this->address,
            'fax' => $this->fax,
            'website' => $this->website,
            'car_name' => $this->car_name,
            'customer_type_id' => $this->customer_type_id,
            'customer_type_name' => $this->customerType?->name,
            'store_id' => $this->store_id,
            'store_name' => $this->store?->name,
            'credit_limit' => $this->credit_limit,
            'created_by' => $this->createdBy?->name,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
