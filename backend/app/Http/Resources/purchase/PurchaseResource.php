<?php

namespace App\Http\Resources\purchase;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'po_no' => $this->po_no,
            'max_sl_no' => $this->max_sl_no,
            'company_sl_no' => $this->company_sl_no,
            'purchase_date' => $this->purchase_date,
            'cash_due' => $this->cash_due,
            'purchase_type' => $this->purchase_type,
            'company_id' => $this->company_id,
            'company' => $this->whenLoaded('company'),
            'store_id' => $this->store_id,
            'ship_by' => $this->ship_by,
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier'),
            'payment_type' => $this->payment_type,
            'payment_amount' => (float) $this->payment_amount,
            'supplier_bill_no' => $this->supplier_bill_no,
            'grand_total' => (float) $this->grand_total,
            'due_amount' => (float) $this->due_amount,
            'status' => $this->status,
            'full_paid' => $this->full_paid,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            'items' => PurchaseDetailResource::collection($this->whenLoaded('details')),
        ];
    }
}
