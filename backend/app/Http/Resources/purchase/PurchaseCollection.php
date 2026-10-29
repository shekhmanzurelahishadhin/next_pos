<?php

namespace App\Http\Resources\purchase;

use Illuminate\Http\Resources\Json\ResourceCollection;

class PurchaseCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return [
            'data' => PurchaseResource::collection($this->collection),
        ];
    }
}
