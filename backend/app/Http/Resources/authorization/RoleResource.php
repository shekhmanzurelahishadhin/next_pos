<?php

namespace App\Http\Resources\authorization;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
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
            'guard_name' => $this->guard_name ?? null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];

        // If columns specified, filter
          if (!empty($this->columns) && is_array($this->columns) && $this->columns !== ['*']) {
              return array_intersect_key($data, array_flip($this->columns));
          }

        return $data;
    }

}
