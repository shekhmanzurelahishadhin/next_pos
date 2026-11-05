<?php

namespace App\Models\inventory;

use App\Models\User;
use App\Models\softConfig\Company;
use App\Models\softConfig\Location;
use App\Models\softConfig\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryAudit extends Model
{
    protected $guarded = ['id'];

    public function details(): HasMany
    {
        return $this->hasMany(InventoryAuditDetail::class);
    }

    public function auditName(): BelongsTo
    {
        return $this->belongsTo(AuditName::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
