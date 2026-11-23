<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// Group of cost centers (parts_bazar CostCategory)
class CostCategory extends Model
{
    protected $guarded = ['id'];

    const ACTIVE = 1;
    const INACTIVE = 2;

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    public function costCenters()
    {
        return $this->hasMany(CostCenter::class, 'cost_category_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
