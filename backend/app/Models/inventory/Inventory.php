<?php

namespace App\Models\inventory;

use App\Models\softConfig\Location;
use App\Models\softConfig\Product;
use App\Models\softConfig\Store;
use Illuminate\Database\Eloquent\Model;

// Stock ledger row: one stock in or stock out of a product at a store location
class Inventory extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'transaction_date' => 'date',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    // Current stock of a product, optionally at one store / location
    public static function closingStock(int $productId, ?int $storeId = null, ?int $locationId = null): float
    {
        return (float) self::where('product_id', $productId)
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when($locationId, fn($q) => $q->where('location_id', $locationId))
            ->selectRaw('COALESCE(SUM(stock_in - stock_out), 0) as stock')
            ->value('stock');
    }
}
