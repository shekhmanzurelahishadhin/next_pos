<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Currency rate in BDT for a date range (parts_bazar currency_convertion_in_bdt)
        Schema::create('currency_conversions', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('currency_id'); // code of the "currency" lookup
            $table->date('date_from');
            $table->date('date_to');
            $table->decimal('amount_in_bdt', 14, 4);
            $table->timestamps();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
        });

        // Opening balance of an account head (parts_bazar chart_of_ac_opening)
        Schema::create('chart_of_ac_openings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ca_id')->index();
            $table->tinyInteger('transaction_type'); // 3 = Dr, 4 = Cr
            $table->date('opening_amount_date');
            $table->unsignedInteger('currency_id');
            $table->decimal('conversion_rate', 14, 4);
            $table->decimal('amount_in_foreign_currency', 16, 2);
            $table->decimal('opening_amount', 16, 2); // in BDT = rate x foreign amount
            $table->decimal('opening_acc_dep', 16, 2)->nullable();
            $table->timestamps();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_ac_openings');
        Schema::dropIfExists('currency_conversions');
    }
};
