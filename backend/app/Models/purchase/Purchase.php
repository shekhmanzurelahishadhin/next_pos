<?php

namespace App\Models\purchase;

use App\Models\User;
use App\Models\softConfig\Company;
use App\Models\softConfig\Store;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Purchase extends Model
{
    use SoftDeletes, SetSlugAndAuditing;

    // status
    const PENDING = 0;   // created, waiting for approve (stock is not in yet)
    const APPROVED = 1;  // received: stock, prices and payment saved
    const CANCELLED = 3;

    // cash_due
    const CASH = '1';
    const DUE = '2';

    const STATUS_NAMES = [
        self::PENDING => 'Pending',
        self::APPROVED => 'Approved',
        self::CANCELLED => 'Cancelled',
    ];

    public $noSlug = true;

    protected $fillable = [
        'po_no',
        'max_sl_no',
        'company_sl_no',
        'purchase_date',
        'cash_due',
        'purchase_type',
        'company_id',
        'store_id',
        'ship_by',
        'supplier_id',
        'payment_type',
        'payment_amount',
        'supplier_bill_no',
        'grand_total',
        'due_amount',
        'status',
        'full_paid',
        'approved_by',
        'approved_at',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'purchase_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'payment_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'due_amount' => 'decimal:2',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(PurchaseDetail::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(PurchaseStatusHistory::class);
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
