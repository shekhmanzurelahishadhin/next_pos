<?php

namespace App\Http\Resources\softConfig\model;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ModelResource extends JsonResource
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
            'brand_id' => $this->brand?->id ?? null,
            'brand_name' => $this->brand?->name ?? null,
            'category_id' => $this->category?->id ?? null,
            'category_name' => $this->category?->name ?? null,
            'sub_category_id' => $this->subCategory?->id ?? null,
            'sub_category_name' => $this->subCategory?->name ?? null,
            'slug' => $this->slug,
            'status' => $this->status,
            'created_by' => $this->createdBy?->name,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
