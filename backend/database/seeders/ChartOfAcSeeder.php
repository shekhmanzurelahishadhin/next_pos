<?php

namespace Database\Seeders;

use App\Models\accounting\ChartOfAc;
use App\Models\accounting\CurrencyConversion;
use Illuminate\Database\Seeder;

// The base heads of the Chart of Accounts, same ids and codes as parts_bazar.
// The software posts journal entries to these ids, so they can not be deleted.
class ChartOfAcSeeder extends Seeder
{
    public function run(): void
    {
        // [id, code, title, root]
        $heads = [
            [ChartOfAc::ASSET, '1', 'ASSET', 0],
            [ChartOfAc::FIXED_ASSET, '6', 'NON-CURRENT ASSET', ChartOfAc::ASSET],
            [ChartOfAc::CURRENT_ASSET, '67', 'CURRENT ASSET', ChartOfAc::ASSET],
            [ChartOfAc::ACCOUNT_RECEIVABLE, '68', 'ACCOUNTS RECEIVABLES', ChartOfAc::CURRENT_ASSET],
            [ChartOfAc::CASH, '70', 'CASH AND CASH EQUIVALENTS', ChartOfAc::CURRENT_ASSET],
            [ChartOfAc::BANK, '87', 'Cash At Bank', ChartOfAc::CASH],
            [ChartOfAc::CASH_IN_HAND_ALL, '71', 'CASH IN HAND - ALL', ChartOfAc::CASH],
            [ChartOfAc::CASH_IN_HAND, '72', 'CASH IN HAND', ChartOfAc::CASH_IN_HAND_ALL],
            [ChartOfAc::ADVANCE_DEPOSIT_PRE_PAYMENT, '148', 'ADVANCE DEPOSIT & PRE-PAYMENT', ChartOfAc::CURRENT_ASSET],
            [ChartOfAc::INVENTORY_STOCK, '737', 'Inventory Stock', ChartOfAc::CURRENT_ASSET],

            [ChartOfAc::LIABILITY, '2', 'LIABILITY', 0],
            [ChartOfAc::CURRENT_LA, '207', 'CURRENT LIABILITY', ChartOfAc::LIABILITY],
            [ChartOfAc::ACCOUNT_PAYABLE, '208', 'ACCOUNTS PAYABLE', ChartOfAc::CURRENT_LA],
            [ChartOfAc::LIABILITY_FOR_EXPENSES, '210', 'LIABILITY FOR EXPENSES', ChartOfAc::CURRENT_LA],
            [ChartOfAc::LONG_TERM_LIABILITY, '254', 'NON-CURRENT LIABILITY', ChartOfAc::LIABILITY],

            [ChartOfAc::INCOME, '4', 'INCOME', 0],
            [ChartOfAc::SALE, '255', 'OPERATING INCOME', ChartOfAc::INCOME],
            [ChartOfAc::SALES_REVENUE, '733', 'Sales Revenue', ChartOfAc::SALE],
            [ChartOfAc::SALES, '714', 'Sales', ChartOfAc::SALES_REVENUE],
            [ChartOfAc::SALES_RETURN, '734', 'Sales Return', ChartOfAc::SALES_REVENUE],
            [ChartOfAc::DISCOUNT_ON_SALES, '735', 'Discount On Sales', ChartOfAc::SALES_REVENUE],
            [ChartOfAc::VAT_ON_SALES, '736', 'VAT On Sales', ChartOfAc::SALES_REVENUE],
            [ChartOfAc::NON_OPERATING_INCOME, '261', 'NON OPERATING INCOME', ChartOfAc::INCOME],

            [ChartOfAc::EXPENSE, '5', 'EXPENSE', 0],
            [ChartOfAc::DIRECT_EXPENSES_HEAD, '322', 'Direct EXPENSE', ChartOfAc::EXPENSE],
            [ChartOfAc::COST_OF_GOODS_SOLD, '738', 'Cost of Goods Sold', ChartOfAc::DIRECT_EXPENSES_HEAD],
            [ChartOfAc::INVENTORY_ADJUSTMENT, '739', 'Inventory Adjustment', ChartOfAc::DIRECT_EXPENSES_HEAD],
            [ChartOfAc::INDIRECT_EXPENSES_HEAD, '323', 'Indirect Expenses', ChartOfAc::EXPENSE],
            [ChartOfAc::ADMINISTRATIVE_EXPENSE, '324', 'Administrative Expenses', ChartOfAc::INDIRECT_EXPENSES_HEAD],

            [ChartOfAc::EQUITY, '3', 'SHAREHOLDERS EQUITY', 0],
        ];

        foreach ($heads as $head) {
            $id = $head[0];
            $root = $head[3];

            // the main head on top of this head
            $mainRootId = 0;
            if ($root != 0) {
                $mainRootId = $this->mainRootOf($root);
            }

            // only a missing head is added, a head the user has renamed stays as it is
            $account = ChartOfAc::find($id);
            if ($account) {
                continue;
            }
            $account = new ChartOfAc();
            $account->id = $id;
            $account->code = $head[1];
            $account->title = $head[2];
            $account->root = $root;
            $account->main_root_id = $mainRootId;
            $account->account_type = ChartOfAc::PARENT_CA;
            $account->head_type = ChartOfAc::MANUAL;
            $account->save();
        }

        // BDT is 1 BDT, like the parts_bazar Currency list, so an opening in BDT works at once
        $hasBdtRate = CurrencyConversion::where('currency_id', CurrencyConversion::BDT)->exists();
        if (!$hasBdtRate) {
            CurrencyConversion::create([
                'currency_id' => CurrencyConversion::BDT,
                'date_from' => '2000-01-01',
                'date_to' => '2999-12-31',
                'amount_in_bdt' => 1,
            ]);
        }
    }

    // walk up the tree until the head with root 0
    private function mainRootOf($id)
    {
        $account = ChartOfAc::find($id);
        while ($account && $account->root != 0) {
            $account = ChartOfAc::find($account->root);
        }
        if ($account) {
            return $account->id;
        }
        return 0;
    }
}
