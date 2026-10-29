<?php

namespace App\Models\softConfig;

use Illuminate\Database\Eloquent\Model;

class ScrollCode extends Model
{
    protected $guarded = ['id'];

    // key => label for each type, in display order
    const KEYS = [
        'month' => [
            '1' => 'January', '2' => 'February', '3' => 'March', '4' => 'April',
            '5' => 'May', '6' => 'June', '7' => 'July', '8' => 'August',
            '9' => 'September', '10' => 'October', '11' => 'November', '12' => 'December',
        ],
        'year' => [
            '0' => 'Digit 0', '1' => 'Digit 1', '2' => 'Digit 2', '3' => 'Digit 3', '4' => 'Digit 4',
            '5' => 'Digit 5', '6' => 'Digit 6', '7' => 'Digit 7', '8' => 'Digit 8', '9' => 'Digit 9',
        ],
        'prefix' => [
            'purchase_order'   => 'Purchase Order',
            'purchase_return'  => 'Purchase Return',
            'supplier_payment' => 'Supplier Payment',
            'sales_invoice'    => 'Sales Invoice',
            'sales_return'     => 'Sales Return',
            'money_receipt'    => 'Money Receipt',
            'expense'          => 'Expense',
            'balance_transfer' => 'Balance Transfer',
        ],
    ];

    // Max code length per type
    const MAX_LENGTH = ['month' => 3, 'year' => 3, 'prefix' => 5];
}
