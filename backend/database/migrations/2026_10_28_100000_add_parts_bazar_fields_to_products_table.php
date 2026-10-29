<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Extra product fields that parts_bazar has (prod_models table)
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->double('min_order_qty')->nullable()->after('short_list_qty');

            // manufacturer, color and size are kept in lookups (type: manufacturer, color, size)
            $table->unsignedBigInteger('manufacturer_id')->nullable()->after('country_id');
            $table->unsignedBigInteger('color_id')->nullable()->after('manufacturer_id');
            $table->unsignedBigInteger('size_id')->nullable()->after('color_id');

            $table->string('warranty')->nullable()->after('size_id');
            $table->text('features')->nullable()->after('warranty');

            // Other vehicle models / years this part fits, comma separated
            $table->text('supported_models')->nullable()->after('model_year');
            $table->string('year_models')->nullable()->after('supported_models');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'min_order_qty', 'manufacturer_id', 'color_id', 'size_id',
                'warranty', 'features', 'supported_models', 'year_models',
            ]);
        });
    }
};
