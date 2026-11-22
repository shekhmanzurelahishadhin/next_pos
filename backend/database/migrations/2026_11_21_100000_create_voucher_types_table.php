<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Voucher Type, like parts_bazar voucher_no_formate (types 1-6):
        // the fixed voucher types and the number format of each (JV# 1, CPV# 1 ...)
        Schema::create('voucher_types', function (Blueprint $table) {
            $table->id()->comment('1 Journal, 2 Contra, 3 Cash Payment, 4 Cash Receive, 5 Bank Payment, 6 Bank Receive');
            $table->string('name', 50);
            $table->string('type_format', 255);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_types');
    }
};
