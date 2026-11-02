<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Short list order, like parts_bazar short_list_order: products we plan to buy, one list per max_sl_no
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('short_list_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('max_sl_no')->index();
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('store_id')->constrained('stores');
            $table->foreignId('product_id')->constrained('products');
            $table->string('code')->nullable()->comment('part number when the list was made');
            $table->decimal('stock_qty', 15, 2)->default(0);
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('order_qty', 15, 2);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('short_list_orders');
    }
};
