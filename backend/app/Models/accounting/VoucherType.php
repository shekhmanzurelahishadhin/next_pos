<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// Voucher Type and its number format (parts_bazar VoucherNoFormate, types 1-6)
class VoucherType extends Model
{
    protected $guarded = ['id'];

    // same ids as parts_bazar
    const JOURNAL = 1;
    const CONTRA = 2;
    const CASH_PAYMENT = 3;
    const CASH_RECEIVE = 4;
    const BANK_PAYMENT = 5;
    const BANK_RECEIVE = 6;

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

    // voucher number shown on a voucher, like parts_bazar voucherNoOfThis: "JV# 12"
    public static function voucherNo($typeId, $entryNo)
    {
        $format = '';
        $type = self::find($typeId);
        if ($type) {
            $format = $type->type_format;
        }
        return $format . '# ' . $entryNo;
    }
}
