<?php

namespace App\Http\Resources\softConfig\category;

use App\Services\softConfig\CategoryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
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
            'slug' => $this->slug,
            'status' => $this->status,
            'created_by' => $this->createdBy ?->name,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];

           if (!empty($this->columns) && is_array($this->columns) && $this->columns !== [CategoryService::defaultColumns]) {
               return array_intersect_key($data, array_flip($this->columns));
           }

        return $data;
    }
}
