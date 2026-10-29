<?php

namespace App\Http\Resources\softConfig\purchasePrice;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchasePriceResource extends JsonResource
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
            'po_no' => $this->po_no,
            'product_id' => $this->product_id,
            'price' => (float) $this->price,
            'qty' => (float) $this->qty,
            'month' => $this->month ? str_pad($this->month, 2, '0', STR_PAD_LEFT) : null,
            'year' => $this->year,
            'date' => $this->date?->format('Y-m-d'),
            'total_value' => $this->when($this->price && $this->qty, fn() => (float) $this->price * $this->qty),

            // Audit fields
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            'deleted_at' => $this->deleted_at?->format('Y-m-d H:i:s'),

            // Relationships
            'product' => $this->whenLoaded('product', function () {
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'sku' => $this->product->sku,
                    'code' => $this->product->code,
                ];
            }),

            'created_by_user' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ];
            }),

            'updated_by_user' => $this->whenLoaded('updatedBy', function () {
                return [
                    'id' => $this->updatedBy->id,
                    'name' => $this->updatedBy->name,
                    'email' => $this->updatedBy->email,
                ];
            }),

            'deleted_by_user' => $this->whenLoaded('deletedBy', function () {
                return [
                    'id' => $this->deletedBy->id,
                    'name' => $this->deletedBy->name,
                    'email' => $this->deletedBy->email,
                ];
            }),
        ];
    }

    /**
     * Customize the response for a given request.
     */
    public function with(Request $request): array
    {
        return [
            'status' => true,
            'message' => 'Success',
        ];
    }
}
