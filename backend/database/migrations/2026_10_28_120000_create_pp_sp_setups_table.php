<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Price code cipher: each digit 0-9 of a price is shown as a secret code
        Schema::create('pp_sp_setups', function (Blueprint $table) {
            $table->id();
            $table->tinyInteger('type')->comment('1 = Purchase Price, 2 = Sale Price');
            $table->json('codes')->comment('10 codes, index = digit 0-9');
            $table->tinyInteger('status')->default(1);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pp_sp_setups');
    }
};
