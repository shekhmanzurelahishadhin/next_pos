<?php

namespace App\Http\Resources\softConfig\product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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

            // Basic info
            'name' => $this->name,
            'part_number' => $this->part_number,

            // Brand
            'brand_id' => $this->brand?->id,
            'brand_name' => $this->brand?->name,

            // Category
            'product_category_id' => $this->category?->id,
            'product_category_name' => $this->category?->name,

            // Sub-category
            'sub_category_id' => $this->subCategory?->id,
            'sub_category_name' => $this->subCategory?->name,

            // Unit
            'unit_id' => $this->unit?->id,
            'unit_name' => $this->unit?->name,

            // Inventory
            'alert_qty' => $this->alert_qty,
            'short_list_qty' => $this->short_list_qty,
            'unit_weight' => $this->unit_weight,

            // Vehicle / model info
            'model' => $this->model,
            'model_year' => $this->model_year,
            'engine' => $this->engine,
            'chassis' => $this->chassis,

            'vehicle_brand_id' => $this->vehicle_brand_id,
            'vehicle_brand_name' => $this->vehicleBrand?->name,

            // Country
            'country_id' => $this->country_id,
            'country_name' => $this->country?->name,

            // Other vehicle models / years this part fits
            'supported_models' => $this->supported_models,
            'year_models' => $this->year_models,

            // Extra details
            'min_order_qty' => $this->min_order_qty,
            'manufacturer_id' => $this->manufacturer_id,
            'manufacturer_name' => $this->manufacturer?->name,
            'color_id' => $this->color_id,
            'color_name' => $this->color?->name,
            'size_id' => $this->size_id,
            'size_name' => $this->size?->name,
            'warranty' => $this->warranty,
            'features' => $this->features,

            // Status
            'status' => $this->status,

            // Audit info
            'created_by' => $this->createdBy?->name,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,

            // Timestamps
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
