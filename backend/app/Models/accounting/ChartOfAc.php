<?php

namespace App\Models\accounting;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// One account head of the Chart of Accounts (parts_bazar ChartOfAc)
class ChartOfAc extends Model
{
    protected $table = 'chart_of_acs';

    protected $guarded = ['id'];

    // root of the 5 main heads
    const MAIN_ROOT = 0;

    // account_type
    const PARENT_CA = 1; // system head, can not be deleted
    const CHILD_CA = 2;

    // head_type
    const MANUAL = 0;
    const AUTO = 1;

    // main heads and the system heads, same ids as parts_bazar
    const ASSET = 1;
    const LIABILITY = 2;
    const INCOME = 3;
    const EXPENSE = 4;
    const EQUITY = 5;
    const FIXED_ASSET = 6;
    const CURRENT_ASSET = 7;
    const CURRENT_LA = 10;
    const LONG_TERM_LIABILITY = 11;
    const SALE = 14;
    const ACCOUNT_PAYABLE = 19;
    const ACCOUNT_RECEIVABLE = 20;
    const CASH = 156;
    const BANK = 157;
    const LIABILITY_FOR_EXPENSES = 384;
    const CASH_IN_HAND = 1588;
    const CASH_IN_HAND_ALL = 3294;
    const NON_OPERATING_INCOME = 3348;
    const ADVANCE_DEPOSIT_PRE_PAYMENT = 4268;
    const DIRECT_EXPENSES_HEAD = 4269;
    const INDIRECT_EXPENSES_HEAD = 4286;
    const ADMINISTRATIVE_EXPENSE = 4465;
    const SALES = 5102;
    const SALES_REVENUE = 5121;
    const SALES_RETURN = 5122;
    const DISCOUNT_ON_SALES = 5124;
    const VAT_ON_SALES = 5125;
    const INVENTORY_STOCK = 5126;
    const COST_OF_GOODS_SOLD = 5127;
    const INVENTORY_ADJUSTMENT = 5128;
    // next_pos heads for the money receipt VDS / TDS and the supplier payment discount
    // (parts_bazar has no working head for these)
    const VDS_RECEIVABLE = 9001;
    const TDS_RECEIVABLE = 9002;
    const DISCOUNT_RECEIVED = 9003;

    // dates go out as local time "2026-11-15 16:01:06", not as UTC
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

    // the bank heads (children of Cash At Bank), like parts_bazar showchildaclistbyroot(157)
    public static function bankOptions(): array
    {
        $rows = self::where('root', self::BANK)->orderBy('title')->get(['id', 'title']);
        $list = [];
        foreach ($rows as $row) {
            $list[] = ['value' => (string) $row->id, 'label' => $row->title];
        }
        return $list;
    }

    public static function isBank($id): bool
    {
        return self::where('id', $id)->where('root', self::BANK)->exists();
    }

    // title of a bank head; an old text bank name comes back as it is
    public static function bankTitle($id): ?string
    {
        if ($id === null || $id === '') {
            return null;
        }
        $title = self::where('id', $id)->value('title');
        if ($title) {
            return $title;
        }
        return (string) $id;
    }
}
