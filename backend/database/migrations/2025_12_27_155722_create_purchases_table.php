<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->string('po_no')->unique();

            $table->integer('max_sl_no')->comment('Global system serial count');
            $table->integer('company_sl_no')->comment('Company serial count');
            $table->date('purchase_date');
            $table->string('cash_due');
            $table->string('purchase_type');
            $table->foreignId('company_id')->constrained('companies');
            $table->integer('store_id');
            $table->string('ship_by');
            $table->foreignId('supplier_id')->constrained();
            $table->string('payment_type');
            $table->decimal('payment_amount', 15, 2)->default(0);
            $table->string('supplier_bill_no')->nullable();
            $table->decimal('grand_total', 15, 2)->default(0);
            $table->decimal('due_amount', 15, 2)->default(0);
            $table->tinyInteger('status')->default(0)->comment('0=Pending, 1=Approved');
            $table->tinyInteger('full_paid')->default(0)->comment('0=Not Full Paid, 1=Full Paid');
            $table->timestamps();
            $table->softDeletes();

            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
        });
    }

    public function down(): void {
        Schema::dropIfExists('purchases');
    }
};
