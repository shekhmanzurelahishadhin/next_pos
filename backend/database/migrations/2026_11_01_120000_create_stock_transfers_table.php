<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Stock transfer, like parts_bazar stock_transfer: barcodes moved to another store / location on approve
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('max_sl_no')->unique();
            $table->string('transfer_no')->unique();
            $table->date('transfer_date');
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->string('remarks')->nullable();
            $table->tinyInteger('status')->default(0)->comment('0 = pending, 1 = approved');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_transfer_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')->constrained('stock_transfers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->string('barcode');
            $table->foreignId('from_store_id')->constrained('stores');
            $table->foreignId('from_location_id')->nullable()->constrained('locations');
            $table->decimal('stock_qty', 15, 2)->default(0)->comment('barcode stock when the transfer was made');
            $table->foreignId('to_store_id')->constrained('stores');
            $table->foreignId('to_location_id')->constrained('locations');
            $table->decimal('transfer_qty', 15, 2);
            $table->string('new_barcode')->nullable()->comment('barcode made at the new place on approve');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_details');
        Schema::dropIfExists('stock_transfers');
    }
};
