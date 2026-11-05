<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Inventory audit, like parts_bazar audit_name_setup + inventory_audit + inventory_audit_detail:
// count the goods of a store location and compare with the ERP stock (stock itself is not changed)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_names', function (Blueprint $table) {
            $table->id();
            $table->string('audit_name')->unique();
            $table->date('from_date');
            $table->date('to_date');
            $table->tinyInteger('status')->default(1)->comment('1 = active, 0 = inactive');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::create('inventory_audits', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('max_sl_no')->unique();
            $table->string('entry_no')->unique();
            $table->foreignId('audit_name_id')->constrained('audit_names');
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('store_id')->constrained('stores');
            $table->foreignId('location_id')->constrained('locations');
            $table->string('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::create('inventory_audit_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_audit_id')->constrained('inventory_audits')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->string('barcode');
            $table->foreignId('location_id')->nullable()->constrained('locations')->comment('where the ERP says the barcode is');
            $table->decimal('erp_qty', 15, 2)->default(0)->comment('barcode stock when the audit was saved');
            $table->decimal('physical_qty', 15, 2)->default(0)->comment('counted qty');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_audit_details');
        Schema::dropIfExists('inventory_audits');
        Schema::dropIfExists('audit_names');
    }
};
