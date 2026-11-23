<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// A cheque written by a Bank Payment or Contra voucher (parts_bazar ChequeEntry)
class ChequeEntry extends Model
{
    protected $guarded = ['id'];

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    public function bank()
    {
        return $this->belongsTo(ChartOfAc::class, 'cb_bank_id');
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
