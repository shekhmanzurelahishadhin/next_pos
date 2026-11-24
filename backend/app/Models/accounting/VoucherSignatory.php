<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// Signatory names of a voucher type (parts_bazar VoucherSignatorySetup)
class VoucherSignatory extends Model
{
    protected $guarded = ['id'];

    const ACTIVE = 1;
    const INACTIVE = 2;

    // dates go out as local time, not as UTC
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    // named "type" so the JSON key does not hide the voucher_type column
    public function type()
    {
        return $this->belongsTo(VoucherType::class, 'voucher_type');
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
