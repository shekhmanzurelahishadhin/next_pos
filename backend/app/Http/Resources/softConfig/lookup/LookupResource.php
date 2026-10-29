<?php

namespace App\Http\Resources\softConfig\lookup;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LookupResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'type'        => $this->type,
            'code'        => $this->code,
            'status'      => (int) $this->status,
            'status_text' => $this->status == 1 ? 'Active' : 'Inactive',

            'created_by' => $this->createdBy?->name,
            'updated_by'  => $this->updated_by,
            'created_at'  => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
            'updated_at'  => $this->updated_at ? $this->updated_at->format('Y-m-d H:i:s') : null,
            'deleted_at'  => $this->deleted_at ? $this->deleted_at->format('Y-m-d H:i:s') : null,
        ];
    }
}
