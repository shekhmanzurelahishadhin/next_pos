<?php

namespace App\Models\inventory;

use App\Models\User;
use App\Models\softConfig\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransfer extends Model
{
    const PENDING = 0;
    const APPROVED = 1;
    const ENTRY_POINT = 'stock_transfer';

    protected $guarded = ['id'];

    protected $casts = [
        'transfer_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(StockTransferDetail::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
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
