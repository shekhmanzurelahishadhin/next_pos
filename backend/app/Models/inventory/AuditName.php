<?php

namespace App\Models\inventory;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// An audit period, e.g. "Nov-2026 Audit"; audit entries are made under it
class AuditName extends Model
{
    const ACTIVE = 1;

    protected $guarded = ['id'];

    protected $casts = [
        'from_date' => 'date:Y-m-d',
        'to_date' => 'date:Y-m-d',
    ];

    public function audits(): HasMany
    {
        return $this->hasMany(InventoryAudit::class);
    }
}
