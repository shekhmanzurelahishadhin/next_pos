<?php

namespace Database\Seeders;

use App\Models\accounting\VoucherType;
use Illuminate\Database\Seeder;

// The fixed voucher types, same ids and formats as parts_bazar voucher_no_formate
class VoucherTypeSeeder extends Seeder
{
    public function run(): void
    {
        // [id, name, format]
        $types = [
            [VoucherType::JOURNAL, 'Journal', 'JV'],
            [VoucherType::CONTRA, 'Contra', 'COV'],
            [VoucherType::CASH_PAYMENT, 'Cash Payment', 'CPV'],
            [VoucherType::CASH_RECEIVE, 'Cash Receive', 'CRV'],
            [VoucherType::BANK_PAYMENT, 'Bank Payment', 'BPV'],
            [VoucherType::BANK_RECEIVE, 'Bank Receive', 'BRV'],
        ];

        foreach ($types as $type) {
            // only a missing type is added, a format the user has changed stays as it is
            $voucherType = VoucherType::find($type[0]);
            if ($voucherType) {
                continue;
            }
            $voucherType = new VoucherType();
            $voucherType->id = $type[0];
            $voucherType->name = $type[1];
            $voucherType->type_format = $type[2];
            $voucherType->save();
        }
    }
}
