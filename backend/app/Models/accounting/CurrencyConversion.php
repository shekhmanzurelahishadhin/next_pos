<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// Currency rate in BDT for a date range (parts_bazar CurrencyConvertionInBdt)
class CurrencyConversion extends Model
{
    protected $guarded = ['id'];

    // codes of the "currency" lookup
    const LOOKUP_TYPE = 'currency';
    const BDT = 3;

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
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
