<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// A leaf of a deleted cheque book, with the remarks of the delete (parts_bazar ChequeBookDeleteHistory)
class ChequeBookDeleteHistory extends Model
{
    protected $guarded = ['id'];

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    public function bank()
    {
        return $this->belongsTo(ChartOfAc::class, 'bank_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
