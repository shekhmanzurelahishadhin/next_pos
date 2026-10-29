<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Direct purchase like parts_bazar: Pending -> Approved (stock in) or Cancelled
        Schema::table('purchases', function (Blueprint $table) {
            $table->string('ship_by')->nullable()->change();
            $table->string('payment_type')->nullable()->change();
            $table->tinyInteger('status')->default(0)->comment('0=Pending, 1=Approved, 3=Cancelled')->change();
            $table->foreignId('approved_by')->nullable()->after('full_paid')->constrained('users');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
        });

        Schema::table('purchase_details', function (Blueprint $table) {
            $table->decimal('sell_price', 15, 2)->default(0)->change();
            $table->string('unit')->nullable()->change();
        });

        // Stock ledger: every stock in / out of a product at a store location
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('store_id')->constrained('stores');
            $table->foreignId('location_id')->nullable()->constrained('locations');
            $table->foreignId('product_id')->constrained('products');
            $table->decimal('stock_in', 15, 2)->default(0);
            $table->decimal('stock_out', 15, 2)->default(0);
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('sell_price', 15, 2)->default(0);
            $table->date('transaction_date');
            $table->string('entry_point', 30)->comment('purchase, sale, purchase_return ...');
            $table->string('entry_no')->nullable()->comment('PO no, invoice no ...');
            $table->unsignedBigInteger('reference_id')->nullable()->comment('detail row id of the entry');
            $table->string('barcode')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['product_id', 'store_id', 'location_id']);
            $table->index(['entry_point', 'entry_no']);
        });

        // Money paid to suppliers
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->string('sl_no')->nullable();
            $table->foreignId('company_id')->nullable()->constrained('companies');
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->foreignId('purchase_id')->nullable()->constrained('purchases');
            $table->string('po_no')->nullable();
            $table->date('payment_date');
            $table->string('payment_type')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('bill_amount', 15, 2)->default(0);
            $table->string('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        // Who approved / denied / cancelled a purchase and when
        Schema::create('purchase_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('purchases')->cascadeOnDelete();
            $table->tinyInteger('status');
            $table->foreignId('changed_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_status_histories');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('inventories');

        Schema::table('purchases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn('approved_at');
        });
    }
};
