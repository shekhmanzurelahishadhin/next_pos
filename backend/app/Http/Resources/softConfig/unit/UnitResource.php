<?php

namespace App\Http\Resources\softConfig\unit;

use App\Services\softConfig\UnitService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnitResource extends JsonResource
{
    protected $columns;

    public function __construct($resource, $columns = null)
    {
        parent::__construct($resource);
        $this->columns = $columns;
    }

    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'slug' => $this->slug,
            'status' => $this->status,
            'created_by' => $this->createdBy?->name,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,

        ];

         if (!empty($this->columns) && is_array($this->columns) && $this->columns !== [UnitService::defaultColumns]) {
             return array_intersect_key($data, array_flip($this->columns));
         }

        return $data;
    }
}
