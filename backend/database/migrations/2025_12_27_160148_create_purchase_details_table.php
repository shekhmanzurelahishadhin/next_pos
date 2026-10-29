<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('purchase_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->onDelete('cascade');

            $table->integer('location_id');
            $table->foreignId('product_id')->constrained('products');
            $table->string('unit');
            $table->integer('qty');
            $table->decimal('unit_price', 15, 2);
            $table->decimal('per_kg', 15, 2)->nullable();
            $table->decimal('sell_price', 15, 2);

            $table->decimal('total_unit_price', 15, 2);
            $table->decimal('total_product_price', 15, 2);
            $table->string('weight_unit')->nullable();
            $table->decimal('total_weight', 15, 2)->nullable();
            $table->decimal('total_weight_amount', 15, 2)->nullable();
            $table->decimal('total_purchase_price', 15, 2);

            $table->timestamps();
            $table->softDeletes();

            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->foreignId('deleted_by')->nullable()->constrained('users');
        });
    }

    public function down(): void {
        Schema::dropIfExists('purchase_details');
    }
};
