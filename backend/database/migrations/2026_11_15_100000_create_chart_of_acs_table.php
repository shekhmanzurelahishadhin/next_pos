<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Chart of Accounts, like parts_bazar chart_of_ac: a tree of account heads.
// root = the parent head (0 for the 5 main heads), main_root_id = the main head on top.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chart_of_acs', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('manual_code')->nullable();
            $table->string('title');
            $table->unsignedBigInteger('root')->default(0)->index();
            $table->unsignedBigInteger('main_root_id')->default(0)->index();
            $table->tinyInteger('account_type')->default(2); // 1 = system head (not deletable), 2 = deletable
            $table->tinyInteger('head_type')->default(0); // 0 = manual, 1 = auto (made by the software)
            $table->decimal('dep', 8, 2)->nullable(); // depreciation %
            $table->date('dep_start_date')->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_acs');
    }
};
