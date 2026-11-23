<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cheque Book: one row for every cheque leaf (parts_bazar cheque_book),
// and the leaves of a deleted book (parts_bazar cheque_book_delete_history)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cheque_books', function (Blueprint $table) {
            $table->id();
            $table->string('book_no', 255);
            $table->unsignedBigInteger('bank_id'); // a head under Cash At Bank
            $table->string('branch_name', 255)->nullable();
            $table->string('cheque_no', 255)->unique();
            $table->tinyInteger('status')->default(1); // 1 Active, 2 Used, 3 Canceled
            $table->unsignedBigInteger('used_by')->nullable();
            $table->dateTime('used_date')->nullable();
            $table->tinyInteger('used_type')->nullable(); // 1 Journal, 2 Supplier Payment, 3 Customer Refund
            $table->integer('journal_type')->nullable(); // voucher type of the voucher that used it
            $table->string('journal_no', 255)->nullable(); // entry no of that voucher
            $table->unsignedBigInteger('supplier_id')->nullable();
            $table->decimal('amount', 16, 2)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->index(['bank_id', 'book_no']);
            $table->index('status');
        });

        Schema::create('cheque_book_delete_histories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cheque_book_id');
            $table->string('book_no', 255);
            $table->unsignedBigInteger('bank_id');
            $table->string('branch_name', 255)->nullable();
            $table->string('cheque_no', 255);
            $table->tinyInteger('status')->nullable();
            $table->unsignedBigInteger('used_by')->nullable();
            $table->dateTime('used_date')->nullable();
            $table->tinyInteger('used_type')->nullable();
            $table->integer('journal_type')->nullable();
            $table->unsignedBigInteger('supplier_id')->nullable();
            $table->decimal('amount', 16, 2)->nullable();
            $table->string('remarks', 255);
            $table->unsignedBigInteger('created_by')->nullable(); // who deleted the book
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cheque_book_delete_histories');
        Schema::dropIfExists('cheque_books');
    }
};
