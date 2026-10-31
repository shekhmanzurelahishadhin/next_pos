<?php

namespace App\Models\sales;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// Money received from a customer (made when a cash sale is approved)
class MoneyReceipt extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'receipt_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
        'bill_amount' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
