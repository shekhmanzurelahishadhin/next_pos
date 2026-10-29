<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Replaces the older products schema from 2025_10_26_160707_create_products_table
        Schema::dropIfExists('products');

        Schema::create('products', function (Blueprint $table) {
            $table->id();

            // Basic product info
            $table->string('name'); // required
            $table->string('part_number')->unique(); // UNIQUE

            // Relations / references
            $table->unsignedBigInteger('company_id')->nullable();
            $table->unsignedBigInteger('brand_id'); // required
            $table->unsignedBigInteger('product_category_id'); // required
            $table->unsignedBigInteger('sub_category_id')->nullable();
            $table->unsignedBigInteger('unit_id')->nullable();

            // Inventory
            $table->integer('alert_qty')->nullable();
            $table->double('short_list_qty')->nullable();

            // Specifications
            $table->string('unit_weight')->nullable();
            $table->unsignedBigInteger('vehicle_brand_id')->nullable();
            $table->string('model')->nullable();
            $table->string('model_year')->nullable();
            $table->string('engine')->nullable();
            $table->string('chassis')->nullable();
            $table->unsignedBigInteger('country_id')->nullable();

            // Status
            $table->tinyInteger('status')
                ->default(1)
                ->comment('0 = Inactive, 1 = Active');

            // Audit fields
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->softDeletes();

            $table->timestamps();

            // Indexes
            $table->index('brand_id');
            $table->index('product_category_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
