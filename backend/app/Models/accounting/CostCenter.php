<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// Cost center a voucher line can be tagged with (parts_bazar CostCenter)
class CostCenter extends Model
{
    protected $guarded = ['id'];

    const ACTIVE = 1;
    const INACTIVE = 2;

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    public function costCategory()
    {
        return $this->belongsTo(CostCategory::class, 'cost_category_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // "title (code)", like parts_bazar nameOfThisWithCode
    public function titleWithCode()
    {
        if ($this->code) {
            return $this->title . ' (' . $this->code . ')';
        }
        return $this->title;
    }
}
