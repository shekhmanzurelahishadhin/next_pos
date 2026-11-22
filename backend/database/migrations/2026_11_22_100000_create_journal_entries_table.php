<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Journal entries, like parts_bazar journal_entry: one row for each Dr or Cr line of a voucher.
        // All lines of one voucher have the same voucher_type and entry_no.
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->unsignedTinyInteger('voucher_type')->comment('voucher_types.id: 1 Journal, 2 Contra, 3 Cash Payment, 4 Cash Receive, 5 Bank Payment, 6 Bank Receive');
            $table->unsignedInteger('type_wise_max_sl_no')->comment('serial of the voucher type in the month');
            $table->string('entry_no', 20)->comment('YYMM + 3 digit serial, e.g. 2611001');
            $table->date('entry_date');
            $table->unsignedBigInteger('ca_id');
            $table->unsignedBigInteger('main_ca')->comment('main head on top of ca_id');
            $table->unsignedTinyInteger('transaction_type')->comment('3 Dr, 4 Cr');
            $table->decimal('amount', 16, 2)->comment('amount in BDT');
            $table->unsignedTinyInteger('currency_id');
            $table->decimal('currency_conversion_rate', 14, 4)->default(1);
            $table->decimal('amount_in_foreign_currency', 16, 2);
            $table->unsignedBigInteger('cost_center_id')->nullable();
            $table->string('narration', 512)->nullable();
            $table->string('cheque_no', 255)->nullable();
            $table->date('cheque_date')->nullable();
            $table->unsignedTinyInteger('payment_type')->nullable()->comment('1 Cash, 2 A/C Payment, 3 Others');
            $table->string('pay_to', 255)->nullable();
            $table->string('receive_from', 255)->nullable();
            $table->string('bill_no', 255)->nullable();
            $table->string('chalan_no', 255)->nullable();
            $table->unsignedTinyInteger('entry_source_type')->default(1)->comment('1 manual voucher, others come from sales, purchase ...');
            $table->unsignedBigInteger('entry_source_id')->nullable();
            $table->string('entry_source_no', 50)->nullable();
            $table->boolean('is_locked')->default(false);
            $table->unsignedBigInteger('locked_by')->nullable();
            $table->dateTime('locked_at')->nullable();
            $table->boolean('is_canceled')->default(false);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->index(['voucher_type', 'entry_no']);
            $table->index('entry_date');
            $table->index('ca_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
