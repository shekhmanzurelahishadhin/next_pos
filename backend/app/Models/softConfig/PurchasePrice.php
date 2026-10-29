<?php

namespace App\Models\softConfig;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Models\User;

class PurchasePrice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'po_no',
        'product_id',
        'price',
        'qty',
        'month',
        'year',
        'date',
        'created_by',
        'updated_by',
        'deleted_by'
    ];

    protected $casts = [
        'date' => 'date',
        'price' => 'float',
        'qty' => 'float',
        'month' => 'integer',
        'year' => 'integer',
    ];

    /**
     * Get the month with leading zeros.
     */
    protected function monthFormatted(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->month ? str_pad($this->month, 2, '0', STR_PAD_LEFT) : null,
        );
    }

    /**
     * Get the total value (price * quantity).
     */
    protected function totalValue(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->price * $this->qty,
        );
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * Scope for filtering by product.
     */
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope for filtering by month and year.
     */
    public function scopeForMonthYear($query, $month, $year)
    {
        return $query->where('month', $month)->where('year', $year);
    }

    /**
     * Scope for searching in PO number or product.
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('po_no', 'like', "%{$search}%")
                ->orWhereHas('product', function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
        });
    }
}
