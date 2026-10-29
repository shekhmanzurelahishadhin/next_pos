<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Codes used to build document numbers: prefix + month code + serial + year code (e.g. SID001AR)
        Schema::create('scroll_codes', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10)->comment('month, year or prefix');
            $table->string('key', 30)->comment('month 1-12, digit 0-9 or document type');
            $table->string('code', 5);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->unique(['type', 'key']);
        });

        // Last serial used per document type and month
        Schema::create('scroll_counters', function (Blueprint $table) {
            $table->id();
            $table->string('scroll_type', 30);
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->unsignedInteger('last_serial')->default(0);
            $table->timestamps();
            $table->unique(['scroll_type', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scroll_counters');
        Schema::dropIfExists('scroll_codes');
    }
};
