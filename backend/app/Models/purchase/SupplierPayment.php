<?php

namespace App\Models\purchase;

use App\Models\User;
use App\Models\softConfig\Company;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// Money paid to a supplier, one row per PO of a PR (sl_no)
// (made from Create Supplier Payment, and when a cash purchase is approved)
class SupplierPayment extends Model
{
    use SoftDeletes, SetSlugAndAuditing;

    const OPENING = 'ob';       // po_no of a line paying the opening balance
    const ADVANCE = 'advance';  // po_no of the part of the lot not given to any PO
    const ADJUSTMENT = '5';     // payment_type: old advance pays the POs, no new money goes out

    public $noSlug = true;

    protected $guarded = ['id'];

    protected $casts = [
        'payment_date' => 'date:Y-m-d',
        'cheque_date' => 'date:Y-m-d',
        'lot_amount' => 'decimal:2',
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'bill_amount' => 'decimal:2',
        'prev_paid_amount' => 'decimal:2',
        'receivable_amount' => 'decimal:2',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
