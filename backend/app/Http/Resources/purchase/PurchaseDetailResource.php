<?php

namespace App\Http\Resources\purchase;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'purchase_id' => $this->purchase_id,
            'location_id' => $this->location_id,
            'product_id' => $this->product_id,
            'product' => $this->whenLoaded('product'),
            'unit' => $this->unit,
            'qty' => $this->qty,
            'unit_price' => (float) $this->unit_price,
            'per_kg' => (float) $this->per_kg,
            'sell_price' => (float) $this->sell_price,
            'total_unit_price' => (float) $this->total_unit_price,
            'total_product_price' => (float) $this->total_product_price,
            'weight_unit' => $this->weight_unit,
            'total_weight' => (float) $this->total_weight,
            'total_weight_amount' => (float) $this->total_weight_amount,
            'total_purchase_price' => (float) $this->total_purchase_price,
        ];
    }
}
