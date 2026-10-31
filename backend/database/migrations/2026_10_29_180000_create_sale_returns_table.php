<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sales return, like parts_bazar sell_return: goods of an approved SO taken back from the customer
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_no')->unique();
            $table->unsignedInteger('max_sl_no')->default(0);
            $table->foreignId('sale_id')->constrained('sales');
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('customer_id')->constrained('customers');
            $table->date('return_date');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->tinyInteger('is_refund')->default(0)->comment('1 = money paid back to the customer');
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->string('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('sale_return_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained('sale_returns');
            $table->foreignId('sale_detail_id')->constrained('sale_details');
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('store_id')->nullable()->constrained('stores');
            $table->foreignId('location_id')->nullable()->constrained('locations');
            $table->string('barcode')->nullable();
            $table->decimal('return_qty', 15, 2);
            $table->decimal('return_price', 15, 2)->comment('sell price of one unit on the SO');
            $table->decimal('total_price', 15, 2);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_details');
        Schema::dropIfExists('sale_returns');
    }
};
