<?php

namespace Database\Seeders;

use App\Models\softConfig\ScrollCode;
use Illuminate\Database\Seeder;

class ScrollCodeSeeder extends Seeder
{
    // Same default codes as parts_bazar
    public function run(): void
    {
        $codes = [
            'month' => ['1' => 'B', '2' => 'A', '3' => 'C', '4' => 'K', '5' => 'G', '6' => 'R',
                        '7' => 'O', '8' => 'U', '9' => 'N', '10' => 'D', '11' => 'X', '12' => 'L'],
            'year'  => ['0' => 'D', '1' => 'B', '2' => 'A', '3' => 'C', '4' => 'K',
                        '5' => 'G', '6' => 'R', '7' => 'O', '8' => 'U', '9' => 'N'],
            'prefix' => ['purchase_order' => 'PO', 'purchase_return' => 'PR', 'supplier_payment' => 'SP',
                         'sales_invoice' => 'SI', 'sales_return' => 'SR', 'money_receipt' => 'MR',
                         'expense' => 'E', 'balance_transfer' => 'BT'],
        ];

        foreach ($codes as $type => $items) {
            foreach ($items as $key => $code) {
                // keep codes the user already changed
                ScrollCode::firstOrCreate(['type' => $type, 'key' => (string) $key], ['code' => $code]);
            }
        }
    }
}
