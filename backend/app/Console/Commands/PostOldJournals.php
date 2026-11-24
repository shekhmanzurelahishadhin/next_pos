<?php

namespace App\Console\Commands;

use App\Models\accounting\JournalEntry;
use App\Models\inventory\Inventory;
use App\Services\inventory\ManualStockService;
use App\Models\purchase\Purchase;
use App\Models\purchase\PurchaseReturn;
use App\Models\purchase\SupplierPayment;
use App\Models\sales\MoneyReceipt;
use App\Models\sales\Sale;
use App\Models\sales\SaleReturn;
use App\Services\accounting\AutoJournalService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Writes the Auto Journal of the entries saved before Auto Journal was added:
// approved sales and purchases, money receipts, supplier payments, returns and inventory adjustments
// that have no journal yet. An entry that already has its journal is left alone, so it can run again.
// The entries go in date order, so the voucher numbers follow the dates.
class PostOldJournals extends Command
{
    protected $signature = 'accounting:post-old-journals
        {--dry-run : only list what would be posted}
        {--user=1 : user id saved as Created By on the vouchers}';

    protected $description = 'Write the auto journal of old sales, purchases, receipts, payments, returns and inventory adjustments';

    // order of the entries of one day, like they happen: buy, sell, money, returns
    const PURCHASE = 1;
    const SUPPLIER_PAYMENT = 2;
    const SALE = 3;
    const MONEY_RECEIPT = 4;
    const SALE_RETURN = 5;
    const PURCHASE_RETURN = 6;
    const INVENTORY_ADJUSTMENT = 7;

    const KIND_NAMES = [
        1 => 'Purchase',
        2 => 'Supplier Payment',
        3 => 'Sale',
        4 => 'Money Receipt',
        5 => 'Sales Return',
        6 => 'Purchase Return',
        7 => 'Inventory Adjustment',
    ];

    public function handle(AutoJournalService $autoJournal)
    {
        Auth::loginUsingId((int) $this->option('user'));

        $todo = $this->collect();
        ksort($todo);

        $counts = [];
        foreach (self::KIND_NAMES as $kind => $name) {
            $counts[$kind] = 0;
        }
        foreach ($todo as $item) {
            $counts[$item['kind']] = $counts[$item['kind']] + 1;
        }

        $rows = [];
        foreach (self::KIND_NAMES as $kind => $name) {
            $rows[] = [$name, $counts[$kind]];
        }
        $this->table(['Entry', 'Without journal'], $rows);

        if ($this->option('dry-run')) {
            foreach ($todo as $item) {
                $this->line($item['date'] . '  ' . self::KIND_NAMES[$item['kind']] . '  ' . $item['no']);
            }
            $this->info('Dry run, nothing is posted.');
            return self::SUCCESS;
        }
        if (count($todo) == 0) {
            $this->info('Every entry already has its journal.');
            return self::SUCCESS;
        }

        $before = JournalEntry::count();
        DB::transaction(function () use ($todo, $autoJournal) {
            foreach ($todo as $item) {
                $this->post($autoJournal, $item);
            }
        });
        $added = JournalEntry::count() - $before;

        $this->info('Posted ' . count($todo) . ' entries, ' . $added . ' journal lines added.');
        return self::SUCCESS;
    }

    // every entry with no journal yet, keyed "date|kind|serial" so ksort puts them in date order
    private function collect(): array
    {
        $todo = [];
        $serial = 0;

        foreach (Purchase::where('status', Purchase::APPROVED)->orderBy('id')->get() as $purchase) {
            if (!$this->hasJournal([JournalEntry::PURCHASE], $purchase->po_no)) {
                $serial++;
                $todo[$this->key($purchase->purchase_date, self::PURCHASE, $serial)] = $this->item(self::PURCHASE, $purchase->po_no, $purchase->purchase_date, $purchase->id);
            }
        }

        $paymentNos = SupplierPayment::select('sl_no')->selectRaw('MIN(payment_date) AS payment_date')->groupBy('sl_no')->orderBy('sl_no')->get();
        foreach ($paymentNos as $payment) {
            if (!$this->hasJournal([JournalEntry::SUPPLIER_PAYMENT], $payment->sl_no)) {
                $serial++;
                $todo[$this->key($payment->payment_date, self::SUPPLIER_PAYMENT, $serial)] = $this->item(self::SUPPLIER_PAYMENT, $payment->sl_no, $payment->payment_date, null);
            }
        }

        foreach (Sale::where('status', Sale::APPROVED)->orderBy('id')->get() as $sale) {
            if (!$this->hasJournal([JournalEntry::SALES], $sale->so_no)) {
                $serial++;
                $todo[$this->key($sale->order_date, self::SALE, $serial)] = $this->item(self::SALE, $sale->so_no, $sale->order_date, $sale->id);
            }
        }

        $receiptNos = MoneyReceipt::select('mr_no')->selectRaw('MIN(receipt_date) AS receipt_date')->groupBy('mr_no')->orderBy('mr_no')->get();
        foreach ($receiptNos as $receipt) {
            if (!$this->hasJournal([JournalEntry::MONEY_RECEIPT], $receipt->mr_no)) {
                $serial++;
                $todo[$this->key($receipt->receipt_date, self::MONEY_RECEIPT, $serial)] = $this->item(self::MONEY_RECEIPT, $receipt->mr_no, $receipt->receipt_date, null);
            }
        }

        foreach (SaleReturn::orderBy('id')->get() as $return) {
            if (!$this->hasJournal([JournalEntry::SALES_RETURN, JournalEntry::SALES_RETURN_REFUND], $return->return_no)) {
                $serial++;
                $todo[$this->key($return->return_date, self::SALE_RETURN, $serial)] = $this->item(self::SALE_RETURN, $return->return_no, $return->return_date, $return->id);
            }
        }

        foreach (PurchaseReturn::orderBy('id')->get() as $return) {
            if (!$this->hasJournal([JournalEntry::PURCHASE_RETURN, JournalEntry::PURCHASE_RETURN_REFUND], $return->return_no)) {
                $serial++;
                $todo[$this->key($return->return_date, self::PURCHASE_RETURN, $serial)] = $this->item(self::PURCHASE_RETURN, $return->return_no, $return->return_date, $return->id);
            }
        }

        // manual stock in / out rows of the Inventory Stock page
        foreach (Inventory::where('entry_point', ManualStockService::ENTRY_POINT)->orderBy('id')->get() as $row) {
            if (!$this->hasJournal([JournalEntry::INVENTORY_ADJUSTMENT], (string) $row->id)) {
                $serial++;
                $todo[$this->key($row->transaction_date, self::INVENTORY_ADJUSTMENT, $serial)] = $this->item(self::INVENTORY_ADJUSTMENT, (string) $row->id, $row->transaction_date, $row->id);
            }
        }

        return $todo;
    }

    private function post(AutoJournalService $autoJournal, array $item): void
    {
        if ($item['kind'] == self::PURCHASE) {
            $autoJournal->postPurchase(Purchase::find($item['id']));
        } elseif ($item['kind'] == self::SUPPLIER_PAYMENT) {
            $autoJournal->postSupplierPayment($item['no']);
        } elseif ($item['kind'] == self::SALE) {
            $autoJournal->postSale(Sale::with('details')->find($item['id']));
        } elseif ($item['kind'] == self::MONEY_RECEIPT) {
            $autoJournal->postMoneyReceipt($item['no']);
        } elseif ($item['kind'] == self::SALE_RETURN) {
            $autoJournal->postSaleReturn(SaleReturn::find($item['id']));
        } elseif ($item['kind'] == self::PURCHASE_RETURN) {
            $autoJournal->postPurchaseReturn(PurchaseReturn::find($item['id']));
        } elseif ($item['kind'] == self::INVENTORY_ADJUSTMENT) {
            $autoJournal->postInventoryAdjustment(Inventory::find($item['id']));
        }
    }

    private function hasJournal(array $sourceTypes, $sourceNo): bool
    {
        return JournalEntry::whereIn('entry_source_type', $sourceTypes)->where('entry_source_no', $sourceNo)->exists();
    }

    private function key($date, $kind, $serial): string
    {
        return $this->dateText($date) . '|' . $kind . '|' . sprintf('%08d', $serial);
    }

    private function item($kind, $no, $date, $id): array
    {
        return ['kind' => $kind, 'no' => $no, 'date' => $this->dateText($date), 'id' => $id];
    }

    private function dateText($date): string
    {
        if ($date instanceof \DateTimeInterface) {
            return $date->format('Y-m-d');
        }
        return substr((string) $date, 0, 10);
    }
}
