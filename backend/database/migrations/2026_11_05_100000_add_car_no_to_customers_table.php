<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Car No of the customer, like parts_bazar customers.car_no
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('car_no')->nullable()->after('car_name');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('car_no');
        });
    }
};
