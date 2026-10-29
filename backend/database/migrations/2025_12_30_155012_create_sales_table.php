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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->integer('max_sl_no')->comment('Global system serial count');
            $table->integer('company_sl_no')->comment('Company serial count');
            $table->string('so_no')->unique();
            $table->date('order_date');
            $table->foreignId('company_id')->constrained('companies');
            $table->string('memo_no')->nullable();
            $table->string('customer_due')->nullable();
            $table->enum('due_limit_exceed_accept', ['Yes', 'No']);

            $table->string('customer_id');
            $table->string('car_name_model')->nullable();
            $table->string('car_no')->nullable();

            $table->decimal('grand_total', 15, 2)->default(0);
            $table->decimal('overall_discount', 15, 2)->default(0);
            $table->decimal('total_with_overall_discount', 15, 2)->nullable();
            $table->decimal('vat_percentage', 5, 2)->default(0);
            $table->decimal('vat_amount', 15, 2)->default(0);
            $table->decimal('grand_total_with_vat', 15, 2)->default(0);
            $table->enum('received_type', ['Cash', 'Card', 'Bank Transfer', 'Credit', 'Other']);
            $table->decimal('received_amount', 15, 2)->default(0);

            $table->tinyInteger('status')->default(0)->comment('0 = pending, 1 = approve');
            $table->date('approve_date')->nullable();
            $table->foreignId('approve_by')->nullable()->constrained('users')->comment('User who approved the sale');
            $table->timestamp('approve_at')->nullable()->comment('Timestamp when approved');

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('so_no');
            $table->index('customer_id');
            $table->index('order_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
