<?php

namespace App\Http\Resources\softConfig\company;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
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
            'code' => $this->code,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'logo' => $this->logo,
            'default_currency' => $this->default_currency,
            'timezone' => $this->timezone,
            'status' => $this->status,
            'created_by' => $this->createdBy?->name,
            'updated_by' => $this->updated_by,
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];

          // If columns specified, filter
          if (!empty($this->columns) && is_array($this->columns) && $this->columns !== ['*']) {
              return array_intersect_key($data, array_flip($this->columns));
          }

        return $data;
    }
}
