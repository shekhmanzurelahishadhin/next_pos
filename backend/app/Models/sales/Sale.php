<?php

namespace App\Models\sales;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\softConfig\Company;
use \App\Models\sales\Customer;

class Sale extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'max_sl_no',
        'company_sl_no',
        'so_no',
        'order_date',
        'company_id',
        'memo_no',
        'customer_due',
        'due_limit_exceed_accept',
        'customer_id',
        'car_name_model',
        'car_no',
        'grand_total',
        'overall_discount',
        'total_with_overall_discount',
        'vat_percentage',
        'vat_amount',
        'grand_total_with_vat',
        'received_type',
        'received_amount',
        'status',
        'approve_date',
        'approve_by',
        'approve_at',

    ];

    protected $casts = [
        'order_date' => 'date',
        'grand_total' => 'decimal:2',
        'overall_discount' => 'decimal:2',
        'total_with_overall_discount' => 'decimal:2',
        'vat_percentage' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'grand_total_with_vat' => 'decimal:2',
        'received_amount' => 'decimal:2',
    ];

    protected $attributes = [
        'due_limit_exceed_accept' => 'No',
        'received_type' => 'Cash',
    ];

    // Relationships
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function details()
    {
        return $this->hasMany(SaleDetail::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
