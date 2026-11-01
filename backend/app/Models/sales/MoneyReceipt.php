<?php

namespace App\Models\sales;

use App\Models\User;
use App\Models\softConfig\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// Money received from a customer, one row per invoice of an MR no
// (made from Create Money Receipt, and when a cash sale is approved)
class MoneyReceipt extends Model
{
    use SoftDeletes;

    const OPENING = 'ob';       // order_no of a line paying the opening balance
    const ADVANCE = 'advance';  // order_no of the part of the lot not given to any invoice
    const ADJUSTMENT = '5';     // received_type: old advance pays the invoices, no new money comes in

    protected $guarded = ['id'];

    protected $casts = [
        'receipt_date' => 'date:Y-m-d',
        'cheque_date' => 'date:Y-m-d',
        'lot_amount' => 'decimal:2',
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'vds' => 'decimal:2',
        'tds' => 'decimal:2',
        'bill_amount' => 'decimal:2',
        'prev_received_amount' => 'decimal:2',
        'receivable_amount' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
