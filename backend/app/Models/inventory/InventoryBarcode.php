<?php

namespace App\Models\inventory;

use App\Models\softConfig\Location;
use App\Models\softConfig\Product;
use App\Models\softConfig\Store;
use Illuminate\Database\Eloquent\Model;

// One barcode = one received PO line: its landed price and how much of it is still in stock
class InventoryBarcode extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'transaction_date' => 'date:Y-m-d',
        'purchase_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'stock_in' => 'decimal:2',
        'stock_out' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    // parts_bazar barcode: 6 random digits + today as ddmmyy, not used yet
    public static function newBarcode(): string
    {
        do {
            $barcode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT) . date('dmy');
        } while (self::where('barcode', $barcode)->exists());

        return $barcode;
    }

    // Qty of this barcode still in stock
    public static function closingStock(?string $barcode): float
    {
        if (!$barcode) {
            return 0;
        }

        $stock = self::where('barcode', $barcode)->selectRaw('COALESCE(SUM(stock_in - stock_out), 0) as stock')->value('stock');
        return (float) $stock;
    }

    // Stock going out of a barcode (purchase return, sale); a negative qty puts it back
    public static function addStockOut(?string $barcode, float $qty): void
    {
        if (!$barcode) {
            return;
        }
        self::where('barcode', $barcode)->increment('stock_out', $qty);
    }

    // Stock coming back into a barcode (sales return); a negative qty takes it out again
    public static function addStockIn(?string $barcode, float $qty): void
    {
        if (!$barcode) {
            return;
        }
        self::where('barcode', $barcode)->increment('stock_in', $qty);
    }
}
