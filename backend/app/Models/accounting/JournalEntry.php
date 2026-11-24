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

    // where the entry comes from (entry_source_type), same numbers parts_bazar writes
    const MANUAL = 1;
    const MONEY_RECEIPT = 2;          // entry_source_no = MR no
    const SALES = 3;                  // SO no
    const SALES_RETURN = 4;           // return no, the due of the customer goes down
    const SALES_RETURN_REFUND = 5;    // return no, the money is paid back
    const PURCHASE = 6;               // PO no
    const PURCHASE_RETURN = 7;        // return no, the due to the supplier goes down
    const PURCHASE_RETURN_REFUND = 8; // return no, the supplier pays the money back
    const SUPPLIER_PAYMENT = 9;       // payment (PR) no
    const INVENTORY_ADJUSTMENT = 10;  // manual stock in / out, inventory row id

    const SOURCE_NAMES = [
        1 => 'Manual',
        2 => 'Money Receipt',
        3 => 'Sales',
        4 => 'Sales Return',
        5 => 'Sales Return (Refund)',
        6 => 'Purchase',
        7 => 'Purchase Return',
        8 => 'Purchase Return (Refund)',
        9 => 'Supplier Payment',
        10 => 'Inventory Adjustment',
    ];

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

    public function costCenter()
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
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
