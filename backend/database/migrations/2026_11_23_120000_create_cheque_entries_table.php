<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cheque Entry: the register of the cheques written by Bank Payment and Contra vouchers
// (parts_bazar cb_cheque_entry)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cheque_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('max_sl'); // SL NO of the register
            $table->date('entry_date');
            $table->unsignedBigInteger('cb_bank_id'); // the bank head of the cheque leaf
            $table->unsignedBigInteger('cheque_book_id')->nullable();
            $table->tinyInteger('payment_type')->nullable(); // 1 Cash, 2 A/C Payment, 3 Others
            $table->string('payment_name', 255)->nullable(); // Beneficiary (Pay To of the voucher)
            $table->string('cheque_no', 55);
            $table->string('cheque_book_no', 55);
            $table->date('cheque_date')->nullable();
            $table->date('clearance_date')->nullable();
            $table->decimal('amount', 16, 2)->default(0);
            $table->text('note')->nullable(); // Purpose (Narration of the voucher)
            // the voucher that wrote it
            $table->integer('voucher_type')->nullable();
            $table->string('entry_no', 20)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->index(['voucher_type', 'entry_no']);
            $table->index('cheque_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cheque_entries');
    }
};
