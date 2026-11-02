<?php

namespace App\Models\inventory;

use App\Models\User;
use App\Models\softConfig\Company;
use App\Models\softConfig\Product;
use App\Models\softConfig\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One product line of a short list; all lines saved together share one max_sl_no
class ShortListOrder extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'stock_qty' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'order_qty' => 'decimal:2',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
