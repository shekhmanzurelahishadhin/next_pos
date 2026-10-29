<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Extra customer fields that parts_bazar has (customers table)
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // A Super Admin without a company can also add customers
            $table->unsignedBigInteger('company_id')->nullable()->change();

            // customer type is kept in lookups (type: customer_type)
            $table->unsignedBigInteger('customer_type_id')->nullable()->after('company_id');
            $table->unsignedBigInteger('store_id')->nullable()->after('customer_type_id');

            // Max due allowed for this customer, 0 = no limit
            $table->decimal('credit_limit', 15, 2)->default(0)->after('opening_balance_type');

            $table->string('car_name')->nullable()->after('address');
            $table->string('fax', 50)->nullable()->after('phone');
            $table->string('website')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['customer_type_id', 'store_id', 'credit_limit', 'car_name', 'fax', 'website']);
        });
    }
};
