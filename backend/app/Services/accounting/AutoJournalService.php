<?php

namespace App\Services\accounting;

use App\Models\accounting\ChartOfAc;
use App\Models\accounting\CurrencyConversion;
use App\Models\accounting\JournalEntry;
use App\Models\accounting\VoucherType;
use App\Models\inventory\Inventory;
use App\Models\purchase\Purchase;
use App\Models\purchase\PurchaseReturn;
use App\Models\purchase\Supplier;
use App\Models\purchase\SupplierPayment;
use App\Models\sales\Customer;
use App\Models\sales\MoneyReceipt;
use App\Models\sales\Sale;
use App\Models\sales\SaleReturn;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Auto Journal: the vouchers the software writes when a sale, purchase, money receipt,
// supplier payment or return is saved (parts_bazar SellItems/approve, PurchaseItems/approve,
// MoneyReceipt/createMoneyReceipt, PaymentReceipt/create, SellDelivery and ReceivedPurchase returns).
// The heads are the fixed system heads of the Chart of Accounts, the bank is the head picked on the form.
// Every voucher keeps its source (entry_source_type + entry_source_no), so it goes when the source is deleted.
// The caller runs these inside its own transaction.
class AutoJournalService
{
    public function __construct(private JournalEntryService $journals)
    {
    }

    // ---------- Sales ----------

    // Sales approve: one journal for the sale, one for the cost of the goods sold
    public function postSale(Sale $sale): void
    {
        $customerName = $this->customerName($sale->customer_id);
        $narration = 'Being sales of goods to ' . $customerName . ', recorded with corresponding COGS and inventory adjustment.';
        $date = $sale->order_date->toDateString();
        $grandTotal = (float) $sale->grand_total;

        // Dr Accounts Receivable, Cr Sales
        $this->postVoucher(VoucherType::JOURNAL, $date, $sale->company_id, $narration, JournalEntry::SALES, $sale->id, $sale->so_no, [
            [ChartOfAc::ACCOUNT_RECEIVABLE, JournalEntry::DEBIT, $grandTotal],
            [ChartOfAc::SALES, JournalEntry::CREDIT, $grandTotal],
        ]);

        // cost of the goods = qty x purchase price of every item
        $cost = 0;
        foreach ($sale->details as $item) {
            $cost = $cost + $item->qty * $item->purchase_price;
        }
        $cost = round($cost, 2);

        // Dr Cost of Goods Sold, Cr Inventory Stock
        $this->postVoucher(VoucherType::JOURNAL, $date, $sale->company_id, $narration, JournalEntry::SALES, $sale->id, $sale->so_no, [
            [ChartOfAc::COST_OF_GOODS_SOLD, JournalEntry::DEBIT, $cost],
            [ChartOfAc::INVENTORY_STOCK, JournalEntry::CREDIT, $cost],
        ]);
    }

    // Money receipt: Dr Cash in Hand (cash) or the bank head, Dr Discount on Sales,
    // Dr VDS Receivable, Dr TDS Receivable, Cr Accounts Receivable (all of them), like parts_bazar MoneyReceiptLot.
    // The money is what came in (invoice amounts + advance).
    // An Adjustment brings no money: only its discount / VDS / TDS go, as a Journal.
    public function postMoneyReceipt(string $mrNo): void
    {
        $receipts = MoneyReceipt::where('mr_no', $mrNo)->get();
        if ($receipts->isEmpty()) {
            return;
        }
        $first = $receipts->first();

        $amount = 0;
        $discount = 0;
        $vds = 0;
        $tds = 0;
        foreach ($receipts as $receipt) {
            $amount = $amount + (float) $receipt->amount;
            $discount = $discount + (float) $receipt->discount;
            $vds = $vds + (float) $receipt->vds;
            $tds = $tds + (float) $receipt->tds;
        }
        $amount = round($amount, 2);
        $discount = round($discount, 2);
        $vds = round($vds, 2);
        $tds = round($tds, 2);
        $lessTotal = round($discount + $vds + $tds, 2);

        $customerName = $this->customerName($first->customer_id);
        $date = $first->receipt_date->toDateString();

        if ($first->received_type == MoneyReceipt::ADJUSTMENT) {
            $narration = 'Being discount, VDS and TDS of ' . $customerName . ' on advance adjustment, reducing Accounts Receivable.';
            $this->postVoucher(VoucherType::JOURNAL, $date, $first->company_id, $narration, JournalEntry::MONEY_RECEIPT, $first->id, $mrNo, [
                [ChartOfAc::DISCOUNT_ON_SALES, JournalEntry::DEBIT, $discount],
                [ChartOfAc::VDS_RECEIVABLE, JournalEntry::DEBIT, $vds],
                [ChartOfAc::TDS_RECEIVABLE, JournalEntry::DEBIT, $tds],
                [ChartOfAc::ACCOUNT_RECEIVABLE, JournalEntry::CREDIT, $lessTotal],
            ]);
            return;
        }

        $bankId = $this->bankHead($first->received_type, $first->bank_name);

        $extra = [];
        if ($bankId) {
            $voucherType = VoucherType::BANK_RECEIVE;
            $cashOrBank = $bankId;
            $narration = 'Being payment received in ' . $first->customer_bank_name . ' from ' . $customerName . ' after allowing discount, reducing Accounts Receivable.';
            $extra = ['cheque_no' => $first->cheque_no, 'cheque_date' => $first->cheque_date];
        } else {
            $voucherType = VoucherType::CASH_RECEIVE;
            $cashOrBank = ChartOfAc::CASH_IN_HAND;
            $narration = 'Being cash received from ' . $customerName . ' after allowing discount, reducing Accounts Receivable.';
        }

        $this->postVoucher($voucherType, $date, $first->company_id, $narration, JournalEntry::MONEY_RECEIPT, $first->id, $mrNo, [
            [$cashOrBank, JournalEntry::DEBIT, $amount],
            [ChartOfAc::DISCOUNT_ON_SALES, JournalEntry::DEBIT, $discount],
            [ChartOfAc::VDS_RECEIVABLE, JournalEntry::DEBIT, $vds],
            [ChartOfAc::TDS_RECEIVABLE, JournalEntry::DEBIT, $tds],
            [ChartOfAc::ACCOUNT_RECEIVABLE, JournalEntry::CREDIT, round($amount + $lessTotal, 2)],
        ], $extra);
    }

    // Sales return: the sale is turned back (Dr Sales, Cr Cash on a refund or Cr Accounts Receivable),
    // and the goods come back to the stock (Dr Inventory Stock, Cr Cost of Goods Sold)
    public function postSaleReturn(SaleReturn $return): void
    {
        $return->loadMissing('details');
        $customerName = $this->customerName($return->customer_id);
        $narration = 'Being goods returned by ' . $customerName . ', reversing the original sales, COGS, and inventory adjustment.';
        $date = $return->return_date->toDateString();
        $total = (float) $return->total_amount;

        if ($return->is_refund) {
            $sourceType = JournalEntry::SALES_RETURN_REFUND;
            $creditHead = ChartOfAc::CASH_IN_HAND;
        } else {
            $sourceType = JournalEntry::SALES_RETURN;
            $creditHead = ChartOfAc::ACCOUNT_RECEIVABLE;
        }

        $this->postVoucher(VoucherType::JOURNAL, $date, $return->company_id, $narration, $sourceType, $return->id, $return->return_no, [
            [ChartOfAc::SALES, JournalEntry::DEBIT, $total],
            [$creditHead, JournalEntry::CREDIT, $total],
        ]);

        // cost of the returned goods = return qty x purchase price on the sold item
        $cost = 0;
        $purchasePrices = DB::table('sale_details')
            ->whereIn('id', $return->details->pluck('sale_detail_id'))
            ->pluck('purchase_price', 'id');
        foreach ($return->details as $detail) {
            $price = 0;
            if (isset($purchasePrices[$detail->sale_detail_id])) {
                $price = (float) $purchasePrices[$detail->sale_detail_id];
            }
            $cost = $cost + $detail->return_qty * $price;
        }
        $cost = round($cost, 2);

        $this->postVoucher(VoucherType::JOURNAL, $date, $return->company_id, $narration, $sourceType, $return->id, $return->return_no, [
            [ChartOfAc::INVENTORY_STOCK, JournalEntry::DEBIT, $cost],
            [ChartOfAc::COST_OF_GOODS_SOLD, JournalEntry::CREDIT, $cost],
        ]);
    }

    // ---------- Purchase ----------

    // Purchase approve: Dr Inventory Stock, Cr Accounts Payable for the bill amount
    public function postPurchase(Purchase $purchase): void
    {
        $supplierName = $this->supplierName($purchase->supplier_id);
        $narration = 'Being purchase of goods from ' . $supplierName . ' against invoice ' . $purchase->po_no . ', recorded in Inventory / Purchase account.';
        $date = $purchase->purchase_date->toDateString();
        $billAmount = (float) $purchase->grand_total;

        $this->postVoucher(VoucherType::JOURNAL, $date, $purchase->company_id, $narration, JournalEntry::PURCHASE, $purchase->id, $purchase->po_no, [
            [ChartOfAc::INVENTORY_STOCK, JournalEntry::DEBIT, $billAmount],
            [ChartOfAc::ACCOUNT_PAYABLE, JournalEntry::CREDIT, $billAmount],
        ]);
    }

    // Supplier payment: Dr Accounts Payable (money + discount), Cr Cash in Hand (cash) or the bank head,
    // Cr Discount Received. The money is what was paid (PO amounts + advance).
    // An Adjustment pays no money: only its discount goes, as a Journal.
    public function postSupplierPayment(string $slNo): void
    {
        $payments = SupplierPayment::where('sl_no', $slNo)->get();
        if ($payments->isEmpty()) {
            return;
        }
        $first = $payments->first();

        $amount = 0;
        $discount = 0;
        foreach ($payments as $payment) {
            $amount = $amount + (float) $payment->amount;
            $discount = $discount + (float) $payment->discount;
        }
        $amount = round($amount, 2);
        $discount = round($discount, 2);

        $supplierName = $this->supplierName($first->supplier_id);
        $date = $first->payment_date->toDateString();

        if ($first->payment_type == SupplierPayment::ADJUSTMENT) {
            $narration = 'Being purchase discount allowed by ' . $supplierName . ' on advance adjustment, reducing Accounts Payable.';
            $this->postVoucher(VoucherType::JOURNAL, $date, $first->company_id, $narration, JournalEntry::SUPPLIER_PAYMENT, $first->id, $slNo, [
                [ChartOfAc::ACCOUNT_PAYABLE, JournalEntry::DEBIT, $discount],
                [ChartOfAc::DISCOUNT_RECEIVED, JournalEntry::CREDIT, $discount],
            ]);
            return;
        }

        $bankId = $this->bankHead($first->payment_type, $first->bank_name);

        $extra = [];
        if ($bankId) {
            $voucherType = VoucherType::BANK_PAYMENT;
            $cashOrBank = $bankId;
            $narration = 'Being payment made through ' . ChartOfAc::bankTitle($bankId) . ' to ' . $supplierName . ' after allowing purchase discount, reducing Accounts Payable.';
            $extra = ['cheque_no' => $first->cheque_no, 'cheque_date' => $first->cheque_date];
        } else {
            $voucherType = VoucherType::CASH_PAYMENT;
            $cashOrBank = ChartOfAc::CASH_IN_HAND;
            $narration = 'Being cash payment made to ' . $supplierName . ' after allowing purchase discount, reducing Accounts Payable.';
        }

        $this->postVoucher($voucherType, $date, $first->company_id, $narration, JournalEntry::SUPPLIER_PAYMENT, $first->id, $slNo, [
            [ChartOfAc::ACCOUNT_PAYABLE, JournalEntry::DEBIT, round($amount + $discount, 2)],
            [$cashOrBank, JournalEntry::CREDIT, $amount],
            [ChartOfAc::DISCOUNT_RECEIVED, JournalEntry::CREDIT, $discount],
        ], $extra);
    }

    // Purchase return: the goods go out of the stock (Cr Inventory Stock),
    // Dr Cash on a refund or Dr Accounts Payable
    public function postPurchaseReturn(PurchaseReturn $return): void
    {
        $supplierName = $this->supplierName($return->supplier_id);
        $poNo = Purchase::where('id', $return->purchase_id)->value('po_no');
        $date = $return->return_date->toDateString();
        $total = (float) $return->total_amount;

        if ($return->is_refund) {
            $sourceType = JournalEntry::PURCHASE_RETURN_REFUND;
            $debitHead = ChartOfAc::CASH_IN_HAND;
            $narration = 'Being cash refunded to ' . $supplierName . ' against returned goods for invoice ' . $poNo . '.';
        } else {
            $sourceType = JournalEntry::PURCHASE_RETURN;
            $debitHead = ChartOfAc::ACCOUNT_PAYABLE;
            $narration = 'Being goods returned to ' . $supplierName . ' against invoice ' . $poNo . ', reducing Accounts Payable.';
        }

        $this->postVoucher(VoucherType::JOURNAL, $date, $return->company_id, $narration, $sourceType, $return->id, $return->return_no, [
            [$debitHead, JournalEntry::DEBIT, $total],
            [ChartOfAc::INVENTORY_STOCK, JournalEntry::CREDIT, $total],
        ]);
    }

    // ---------- Inventory ----------

    // Manual stock in / out (parts_bazar inventory/create), amount = purchase price x qty:
    // stock in = Dr Inventory Stock, Cr Inventory Adjustment; stock out = Dr Inventory Adjustment, Cr Inventory Stock
    public function postInventoryAdjustment(Inventory $row): void
    {
        $date = $row->transaction_date->toDateString();

        if ((float) $row->stock_out > 0) {
            $amount = round((float) $row->purchase_price * (float) $row->stock_out, 2);
            $narration = 'Being manual stock OUT from inventory due to Stock Adjustment, decreasing Inventory.';
            $lines = [
                [ChartOfAc::INVENTORY_ADJUSTMENT, JournalEntry::DEBIT, $amount],
                [ChartOfAc::INVENTORY_STOCK, JournalEntry::CREDIT, $amount],
            ];
        } else {
            $amount = round((float) $row->purchase_price * (float) $row->stock_in, 2);
            $narration = 'Being manual stock IN to inventory due to Stock Adjustment, increasing Inventory.';
            $lines = [
                [ChartOfAc::INVENTORY_STOCK, JournalEntry::DEBIT, $amount],
                [ChartOfAc::INVENTORY_ADJUSTMENT, JournalEntry::CREDIT, $amount],
            ];
        }

        $this->postVoucher(VoucherType::JOURNAL, $date, $row->company_id, $narration, JournalEntry::INVENTORY_ADJUSTMENT, $row->id, (string) $row->id, $lines);
    }

    // ---------- remove ----------

    // every voucher of one source goes, like parts_bazar deleteAll(entry_source_no, entry_source_type)
    public function remove(array $sourceTypes, string $sourceNo): void
    {
        JournalEntry::whereIn('entry_source_type', $sourceTypes)->where('entry_source_no', $sourceNo)->delete();
    }

    // ---------- helpers ----------

    // one voucher with its own no; lines are [head id, Dr/Cr, amount], a line with no amount is left out
    private function postVoucher($voucherType, $date, $companyId, $narration, $sourceType, $sourceId, $sourceNo, array $lines, array $extra = []): void
    {
        $useLines = [];
        foreach ($lines as $line) {
            if ($line[2] > 0) {
                $useLines[] = $line;
            }
        }
        if (count($useLines) == 0) {
            return;
        }

        // lock the rows of this type, so two saves at once can not get the same no
        JournalEntry::where('voucher_type', $voucherType)->lockForUpdate()->count();
        $serial = $this->journals->nextSerial($voucherType, $date);
        $entryNo = $this->journals->formattedNo($date, $serial);

        foreach ($useLines as $line) {
            $account = ChartOfAc::find($line[0]);
            if (!$account) {
                throw new \RuntimeException('Account head ' . $line[0] . ' is not in the Chart of Accounts.');
            }

            $entry = new JournalEntry();
            $entry->company_id = $companyId;
            $entry->voucher_type = $voucherType;
            $entry->type_wise_max_sl_no = $serial;
            $entry->entry_no = $entryNo;
            $entry->entry_date = $date;
            $entry->ca_id = $account->id;
            $entry->main_ca = $account->main_root_id;
            $entry->transaction_type = $line[1];
            $entry->currency_id = CurrencyConversion::BDT;
            $entry->currency_conversion_rate = 1;
            $entry->amount = $line[2];
            $entry->amount_in_foreign_currency = $line[2];
            $entry->narration = mb_substr($narration, 0, 512);
            $entry->cheque_no = $extra['cheque_no'] ?? null;
            $entry->cheque_date = $extra['cheque_date'] ?? null;
            $entry->entry_source_type = $sourceType;
            $entry->entry_source_id = $sourceId;
            $entry->entry_source_no = $sourceNo;
            $entry->created_by = Auth::id();
            $entry->save();
        }
    }

    // the bank head of a cheque / deposit; a cash (or card with no bank) receipt goes to Cash in Hand
    private function bankHead($type, $bankName)
    {
        if ($type == '1' || $type === null || $type === '') {
            return null;
        }
        if (!empty($bankName) && ChartOfAc::isBank($bankName)) {
            return (int) $bankName;
        }
        return null;
    }

    private function customerName($customerId): string
    {
        return (string) Customer::where('id', $customerId)->value('name');
    }

    private function supplierName($supplierId): string
    {
        return (string) Supplier::where('id', $supplierId)->value('name');
    }
}
