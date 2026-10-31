<?php

namespace App\Models\sales;

use App\Models\User;
use App\Models\softConfig\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sale extends Model
{
    use SoftDeletes;

    const PENDING = 0;   // created, stock not out yet
    const APPROVED = 1;  // stock out, money receipt saved, locked

    const CASH = '1';
    const DUE = '2';

    const STATUS_NAMES = [
        self::PENDING => 'Pending',
        self::APPROVED => 'Approved',
    ];

    protected $guarded = ['id'];

    protected $casts = [
        'order_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'grand_total' => 'decimal:2',
        'received_amount' => 'decimal:2',
        'due_amount' => 'decimal:2',
        'previous_due' => 'decimal:2',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(SaleDetail::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
