<?php

namespace App\Models\sales;

use App\Models\softConfig\Location;
use App\Models\softConfig\Product;
use App\Models\softConfig\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One sold barcode of a sale
class SaleDetail extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'qty' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
