<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('customers_contact', function (Blueprint $table) {
            $table->id();
            $table->string('district', 255);
            $table->unsignedBigInteger('company_id');
            $table->string('customer_name');
            $table->string('contact_one', 20);
            $table->string('contact_two', 20)->nullable();
            $table->string('contact_three', 20)->nullable();
            $table->text('remarks')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('customers_contact');
    }
};
