<?php

namespace App\Models\sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\softConfig\Product;

class SaleDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'store_id',
        'location_id',
        'product_id',
        'barcode_no',
        'unit_id',
        'purchase_price',
        'quantity',
        'price',
        'discount',
        'total_amount'
    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'price' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    // Relationships
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
