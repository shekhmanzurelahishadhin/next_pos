<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Voucher Signatory Setup (parts_bazar voucher_signatory_setup)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voucher_signatories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_type')->constrained('voucher_types');
            $table->string('signatory_name', 255);
            $table->unsignedInteger('order_qty'); // the place of the signature on the voucher
            $table->tinyInteger('status')->default(1); // 1 Active, 2 Inactive
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_signatories');
    }
};
