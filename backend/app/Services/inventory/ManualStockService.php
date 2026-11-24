<?php

namespace App\Services\inventory;

use App\Models\accounting\JournalEntry;
use App\Models\inventory\Inventory;
use App\Models\inventory\InventoryBarcode;
use App\Models\softConfig\PurchasePrice;
use App\Models\softConfig\Store;
use App\Services\accounting\AutoJournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Manual stock in / out on the Inventory Stock page, like parts_bazar inventory/create:
// Stock In  = a new barcode with the given purchase price, the price becomes the active purchase price
// Stock Out = qty taken out of an existing barcode at its purchase price
// Both write an Inventory Adjustment journal.
class ManualStockService
{
    const ENTRY_POINT = 'manual';
    const STOCK_IN = 'in';
    const STOCK_OUT = 'out';

    public function __construct(private AutoJournalService $autoJournal)
    {
    }

    public function save(array $data): Inventory
    {
        if ($data['type'] == self::STOCK_OUT) {
            return $this->stockOut($data);
        }
        return $this->stockIn($data);
    }

    private function stockIn(array $data): Inventory
    {
        $store = Store::find($data['store_id']);
        $companyId = $store ? $store->company_id : null;

        // same product, store, location and date saved in the last 30 seconds = double click
        $duplicate = Inventory::where('entry_point', self::ENTRY_POINT)
            ->where('product_id', $data['product_id'])
            ->where('store_id', $data['store_id'])
            ->where('location_id', $data['location_id'])
            ->whereDate('transaction_date', $data['transaction_date'])
            ->where('stock_in', '>', 0)
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        DB::beginTransaction();
        try {
            $date = \Carbon\Carbon::parse($data['transaction_date']);
            $stockRow = [
                'company_id'       => $companyId,
                'store_id'         => $data['store_id'],
                'location_id'      => $data['location_id'],
                'product_id'       => $data['product_id'],
                'stock_in'         => $data['qty'],
                'purchase_price'   => $data['purchase_price'],
                'transaction_date' => $date->toDateString(),
                'entry_point'      => self::ENTRY_POINT,
                'barcode'          => InventoryBarcode::newBarcode(),
            ];

            $row = Inventory::create($stockRow + [
                'remarks'    => $data['remarks'] ?? null,
                'created_by' => Auth::id(),
            ]);
            // the transaction no of a manual row is its own id, like parts_bazar
            $row->update(['entry_no' => (string) $row->id, 'reference_id' => $row->id]);

            InventoryBarcode::create($stockRow + ['entry_no' => (string) $row->id, 'reference_id' => $row->id]);

            // the price becomes the active purchase price, like parts_bazar PurchasePricesManual
            PurchasePrice::where('product_id', $data['product_id'])->update(['is_active' => 0]);
            PurchasePrice::create([
                'is_active'  => 1,
                'po_no'      => $this->priceTag($row->id),
                'product_id' => $data['product_id'],
                'price'      => $data['purchase_price'],
                'qty'        => $data['qty'],
                'month'      => $date->month,
                'year'       => $date->year,
                'date'       => $date->toDateString(),
                'created_by' => Auth::id(),
            ]);

            $this->autoJournal->postInventoryAdjustment($row);

            DB::commit();
            return $row;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function stockOut(array $data): Inventory
    {
        $barcode = InventoryBarcode::where('barcode', $data['barcode'])->first();
        if (!$barcode) {
            throw new \RuntimeException('Barcode not found.');
        }
        if ((float) $data['qty'] > InventoryBarcode::closingStock($barcode->barcode)) {
            throw new \RuntimeException('Stock-in quantity cannot be greater than closing stock.');
        }

        $duplicate = Inventory::where('entry_point', self::ENTRY_POINT)
            ->where('barcode', $barcode->barcode)
            ->whereDate('transaction_date', $data['transaction_date'])
            ->where('stock_out', '>', 0)
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();
        if ($duplicate) {
            throw new \RuntimeException('Duplicate submission detected. Please wait a few seconds.');
        }

        DB::beginTransaction();
        try {
            $row = Inventory::create([
                'company_id'       => $barcode->company_id,
                'store_id'         => $barcode->store_id,
                'location_id'      => $barcode->location_id,
                'product_id'       => $barcode->product_id,
                'stock_out'        => $data['qty'],
                // the purchase price of the barcode, like parts_bazar (read only on the form)
                'purchase_price'   => $barcode->purchase_price,
                'sell_price'       => $barcode->sell_price,
                'transaction_date' => $data['transaction_date'],
                'entry_point'      => self::ENTRY_POINT,
                'barcode'          => $barcode->barcode,
                'remarks'          => $data['remarks'] ?? null,
                'created_by'       => Auth::id(),
            ]);
            $row->update(['entry_no' => (string) $row->id, 'reference_id' => $row->id]);

            InventoryBarcode::addStockOut($barcode->barcode, (float) $data['qty']);

            $this->autoJournal->postInventoryAdjustment($row);

            DB::commit();
            return $row;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // a manual row goes with its stock, purchase price and journal
    public function delete(Inventory $row): void
    {
        if ($row->entry_point != self::ENTRY_POINT) {
            throw new \RuntimeException('Only a manual stock in / out can be deleted here.');
        }

        DB::beginTransaction();
        try {
            if ((float) $row->stock_out > 0) {
                // the qty goes back to the barcode
                InventoryBarcode::addStockOut($row->barcode, -(float) $row->stock_out);
            } else {
                // a stock in can go only while nothing of its barcode is sold, moved or taken out
                if (InventoryBarcode::closingStock($row->barcode) < (float) $row->stock_in) {
                    throw new \RuntimeException('This stock is already used, it can not be deleted.');
                }
                InventoryBarcode::where('barcode', $row->barcode)->delete();

                // its purchase price goes; when it was the active one, the latest other price is active again
                $price = PurchasePrice::where('po_no', $this->priceTag($row->id))->first();
                if ($price) {
                    $wasActive = $price->is_active;
                    $price->update(['deleted_by' => Auth::id(), 'is_active' => 0]);
                    $price->delete();
                    if ($wasActive) {
                        $latest = PurchasePrice::where('product_id', $row->product_id)->orderByDesc('date')->orderByDesc('id')->first();
                        if ($latest) {
                            $latest->update(['is_active' => 1]);
                        }
                    }
                }
            }

            $this->autoJournal->remove([JournalEntry::INVENTORY_ADJUSTMENT], (string) $row->id);
            $row->delete();

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // po_no of the purchase price a manual stock in makes
    private function priceTag($id): string
    {
        return 'MANUAL-' . $id;
    }
}
