<?php

namespace App\Http\Resources\softConfig\ppSpSetup;

use App\Models\softConfig\PpSpSetup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PpSpSetupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'type'       => $this->type,
            'type_name'  => $this->type == PpSpSetup::PURCHASE_PRICE ? 'Purchase Price' : 'Sale Price',
            'codes'      => $this->codes,
            'status'     => $this->status,
            'created_by' => $this->createdBy?->name ?? null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
