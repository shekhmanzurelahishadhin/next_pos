<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cost Category and Cost Center (parts_bazar cost_category / cost_center)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cost_categories', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->tinyInteger('status')->default(1); // 1 Active, 2 Inactive
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });

        Schema::create('cost_centers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cost_category_id')->constrained('cost_categories');
            $table->string('title', 255);
            $table->string('code', 100)->nullable();
            $table->tinyInteger('status')->default(1); // 1 Active, 2 Inactive
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cost_centers');
        Schema::dropIfExists('cost_categories');
    }
};
