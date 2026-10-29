<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// purchase_prices keeps every price (from approved purchases and added by hand, like
// parts_bazar purchase_prices + purchase_prices_manual). One row per product is active.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_prices', function (Blueprint $table) {
            $table->double('original_price')->nullable()->after('price')->comment('price before VAT, when added by hand');
            $table->double('vat_percent')->default(0)->after('original_price');
            $table->tinyInteger('is_active')->default(0)->after('date')->comment('1 = active purchase price of the product');
        });

        // the latest price of each product becomes the active one
        DB::statement('UPDATE purchase_prices pp
            JOIN (SELECT MAX(id) AS id FROM purchase_prices WHERE deleted_at IS NULL GROUP BY product_id) latest ON latest.id = pp.id
            SET pp.is_active = 1');
    }

    public function down(): void
    {
        Schema::table('purchase_prices', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'vat_percent', 'is_active']);
        });
    }
};
