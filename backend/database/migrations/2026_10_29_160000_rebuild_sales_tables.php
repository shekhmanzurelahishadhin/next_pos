<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sales like parts_bazar sell_items: create SO (pending) -> approve = stock out by barcode + money receipt.
// The old empty sales / sale_details tables did not fit that flow, so they are made again.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('sale_details');
        Schema::dropIfExists('sales');

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('so_no')->unique();
            $table->unsignedInteger('max_sl_no')->default(0);
            $table->unsignedInteger('company_sl_no')->default(0);
            $table->foreignId('company_id')->constrained('companies');
            $table->date('order_date');
            $table->string('cash_due', 5)->comment('lookup cash_due: 1 Cash, 2 Due');
            $table->string('memo_no')->nullable();
            $table->foreignId('customer_id')->constrained('customers');
            $table->string('mobile_no')->nullable();
            $table->string('car_name')->nullable();
            $table->string('car_no')->nullable();
            $table->tinyInteger('due_limit_exceed_accept')->default(1)->comment('1 Yes, 2 No');
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->string('received_type', 5)->nullable()->comment('lookup payment_type');
            $table->decimal('received_amount', 15, 2)->default(0);
            $table->decimal('due_amount', 15, 2)->default(0);
            $table->decimal('previous_due', 15, 2)->default(0)->comment('customer due before this SO, saved on approve');
            $table->tinyInteger('status')->default(0)->comment('0 Pending, 1 Approved');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('sale_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales');
            $table->foreignId('store_id')->constrained('stores');
            $table->foreignId('location_id')->nullable()->constrained('locations');
            $table->foreignId('product_id')->constrained('products');
            $table->string('barcode');
            $table->string('unit')->nullable();
            $table->decimal('qty', 15, 2);
            $table->decimal('purchase_price', 15, 2)->default(0)->comment('landed cost of the barcode');
            $table->decimal('sell_price', 15, 2);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('money_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('mr_no')->unique();
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('sale_id')->nullable()->constrained('sales');
            $table->string('order_no')->nullable()->comment('SO no');
            $table->date('receipt_date');
            $table->string('received_type', 5)->nullable()->comment('lookup payment_type');
            $table->decimal('amount', 15, 2);
            $table->decimal('bill_amount', 15, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('money_receipts');
        Schema::dropIfExists('sale_details');
        Schema::dropIfExists('sales');
    }
};
