<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// One cheque leaf of a cheque book (parts_bazar ChequeBook)
class ChequeBook extends Model
{
    protected $guarded = ['id'];

    // status of a leaf
    const ACTIVE = 1;
    const CLEARED = 2; // shown as USED
    const CANCELED = 3;

    const STATUS_NAMES = [self::ACTIVE => 'ACTIVE', self::CLEARED => 'USED', self::CANCELED => 'CANCELED'];

    // what used the leaf
    const JOURNAL = 1;
    const SUPPLIER_PAYMENT = 2;
    const CUSTOMER_REFUND = 3;

    const USED_TYPE_NAMES = [self::JOURNAL => 'JOURNAL', self::SUPPLIER_PAYMENT => 'SUPPLIER PAYMENT', self::CUSTOMER_REFUND => 'DISTRIBUTOR REFUND'];

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    public function bank()
    {
        return $this->belongsTo(ChartOfAc::class, 'bank_id');
    }

    public function usedBy()
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
