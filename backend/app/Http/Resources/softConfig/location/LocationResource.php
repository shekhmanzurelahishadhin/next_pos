<?php

namespace App\Http\Resources\softConfig\location;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationResource extends JsonResource
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
            'store_id' => $this->store?->id ?? null,
            'store_name' => $this->store?->name ?? null,
            'company_id' => $this->company?->id ?? null,
            'company_name' => $this->company?->name ?? null,
            'status' => $this->status,
            'description' => $this->description,
            'created_by' => $this->createdBy?->name ?? null,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
