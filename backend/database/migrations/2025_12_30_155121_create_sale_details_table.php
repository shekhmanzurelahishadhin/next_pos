<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sale_details', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            $table->string('store_id')->nullable();
            $table->string('location_id')->nullable();
            $table->foreignId('product_id')->constrained('products');
            $table->string('barcode_no')->nullable();
            $table->string('unit_id')->nullable();
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->integer('quantity')->default(1);
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);


            // Timestamps
            $table->timestamps();

            // Indexes
            $table->index('sale_id');
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_details');
    }
};
