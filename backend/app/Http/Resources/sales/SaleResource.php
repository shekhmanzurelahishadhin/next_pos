<?php

namespace App\Http\Resources\sales;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\softConfig\company\CompanyResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'max_sl_no' => $this->max_sl_no,
            'company_sl_no' => $this->company_sl_no,
            'so_no' => $this->so_no,
            'order_date' => $this->order_date->format('Y-m-d'),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'memo_no' => $this->memo_no,
            'customer_due' => $this->customer_due,
            'due_limit_exceed_accept' => $this->due_limit_exceed_accept,
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer'),
            'car_name_model' => $this->car_name_model,
            'car_no' => $this->car_no,

            // Financial information
            'grand_total' => (float) $this->grand_total,
            'overall_discount' => (float) $this->overall_discount,
            'total_with_overall_discount' => (float) $this->total_with_overall_discount,
            'vat_percentage' => (float) $this->vat_percentage,
            'vat_amount' => (float) $this->vat_amount,
            'grand_total_with_vat' => (float) $this->grand_total_with_vat,

            // Payment information
            'received_type' => $this->received_type,
            'received_amount' => (float) $this->received_amount,
            'balance' => (float) ($this->grand_total_with_vat - $this->received_amount),

            // Relationships
            'details' => SaleDetailResource::collection($this->whenLoaded('details')),

            // Timestamps
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            'deleted_at' => $this->deleted_at?->format('Y-m-d H:i:s'),
        ];
    }
}
