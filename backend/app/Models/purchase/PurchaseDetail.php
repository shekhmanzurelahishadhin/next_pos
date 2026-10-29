<?php

namespace App\Models\purchase;

use App\Models\softConfig\Location;
use App\Models\softConfig\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseDetail extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'purchase_id',
        'location_id',
        'product_id',
        'unit',
        'qty',
        'unit_price',
        'per_kg',
        'sell_price',
        'total_unit_price',
        'total_product_price',
        'weight_unit',
        'total_weight',
        'total_weight_amount',
        'total_purchase_price',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'per_kg' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'total_unit_price' => 'decimal:2',
        'total_product_price' => 'decimal:2',
        'total_weight' => 'decimal:2',
        'total_weight_amount' => 'decimal:2',
        'total_purchase_price' => 'decimal:2',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
