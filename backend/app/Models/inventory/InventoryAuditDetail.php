<?php

namespace App\Models\inventory;

use App\Models\softConfig\Location;
use App\Models\softConfig\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryAuditDetail extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'erp_qty' => 'decimal:2',
        'physical_qty' => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
