<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// Opening balance of an account head (parts_bazar ChartOfAcOpening)
class ChartOfAcOpening extends Model
{
    protected $guarded = ['id'];

    // transaction_type, same numbers as parts_bazar ChartOfAc::DEBIT / CREDIT
    const DEBIT = 3;
    const CREDIT = 4;

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    public function account()
    {
        return $this->belongsTo(ChartOfAc::class, 'ca_id');
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
