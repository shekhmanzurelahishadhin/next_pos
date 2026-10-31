<?php

namespace App\Models\sales;

use App\Models\softConfig\Location;
use App\Models\softConfig\Product;
use App\Models\softConfig\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnDetail extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'return_qty' => 'decimal:2',
        'return_price' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    public function saleDetail(): BelongsTo
    {
        return $this->belongsTo(SaleDetail::class);
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
