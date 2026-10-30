<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Like parts_bazar inventory_barcode: one row per barcode (one received PO line) with its
// landed purchase price and how much of it came in and went out. inventories stays the ledger.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_barcodes', function (Blueprint $table) {
            $table->id();
            $table->string('barcode')->unique();
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('store_id')->constrained('stores');
            $table->foreignId('location_id')->nullable()->constrained('locations');
            $table->foreignId('product_id')->constrained('products');
            $table->string('entry_point', 30)->comment('where the stock came from: purchase ...');
            $table->string('entry_no')->nullable()->comment('PO no');
            $table->unsignedBigInteger('reference_id')->nullable()->comment('purchase_details id');
            $table->decimal('purchase_price', 15, 2)->default(0)->comment('landed cost of one unit');
            $table->decimal('sell_price', 15, 2)->default(0);
            $table->decimal('stock_in', 15, 2)->default(0);
            $table->decimal('stock_out', 15, 2)->default(0)->comment('purchase return, sale ...');
            $table->date('transaction_date');
            $table->timestamps();
            $table->index(['product_id', 'store_id', 'location_id']);
        });

        // barcodes of the purchases approved before this table existed
        DB::statement("INSERT INTO inventory_barcodes
            (barcode, company_id, store_id, location_id, product_id, entry_point, entry_no, reference_id,
             purchase_price, sell_price, stock_in, stock_out, transaction_date, created_at, updated_at)
            SELECT i.barcode, i.company_id, i.store_id, i.location_id, i.product_id, i.entry_point, i.entry_no, i.reference_id,
                   i.purchase_price, i.sell_price, i.stock_in,
                   (SELECT COALESCE(SUM(o.stock_out), 0) FROM inventories o WHERE o.barcode = i.barcode AND o.stock_out > 0),
                   i.transaction_date, NOW(), NOW()
            FROM inventories i
            WHERE i.entry_point = 'purchase' AND i.barcode IS NOT NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_barcodes');
    }
};
