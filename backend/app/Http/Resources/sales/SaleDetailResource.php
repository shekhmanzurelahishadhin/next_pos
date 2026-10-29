<?php

namespace App\Http\Resources\sales;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\softConfig\product\ProductResource;

class SaleDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'store_id' => $this->store_id,
            'location_id' => $this->location_id,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'barcode_no' => $this->barcode_no,
            'unit_id' => $this->unit_id,
            'price_price' => (float) $this->price_price,
            'quantity' => (int) $this->quantity,
            'price' => (float) $this->price,
            'discount' => (float) $this->discount,
            'total_amount' => (float) $this->total_amount,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
