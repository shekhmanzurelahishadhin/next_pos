<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// One Dr or Cr line of a voucher (parts_bazar JournalEntry)
class JournalEntry extends Model
{
    protected $guarded = ['id'];

    const DEBIT = 3;
    const CREDIT = 4;

    // where the entry comes from
    const MANUAL = 1;

    // payment type of a cheque (parts_bazar form)
    const PAYMENT_TYPES = [1 => 'Cash', 2 => 'A/C Payment', 3 => 'Others'];

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
