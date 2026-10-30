<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Purchase return, like parts_bazar purchase_return: goods of an approved PO sent back to the supplier
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_no')->unique();
            $table->unsignedInteger('max_sl_no')->default(0);
            $table->foreignId('purchase_id')->constrained('purchases');
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('store_id')->constrained('stores');
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->date('return_date');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->tinyInteger('is_refund')->default(0)->comment('1 = supplier paid the money back');
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->string('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('purchase_return_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_return_id')->constrained('purchase_returns');
            $table->foreignId('purchase_detail_id')->constrained('purchase_details');
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('location_id')->nullable()->constrained('locations');
            $table->string('barcode')->nullable();
            $table->decimal('return_qty', 15, 2);
            $table->decimal('unit_price', 15, 2)->comment('landed cost of one unit on the PO');
            $table->decimal('total_price', 15, 2);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_return_details');
        Schema::dropIfExists('purchase_returns');
    }
};
