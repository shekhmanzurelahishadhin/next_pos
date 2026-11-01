<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Money receipt / supplier payment like parts_bazar: one MR (or PR) no has one line per invoice,
// a line can carry discount (and VDS / TDS for customers), the rest of the lot amount is an "advance" line
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('money_receipts', function (Blueprint $table) {
            $table->dropUnique('money_receipts_mr_no_unique');
            $table->index('mr_no');
            $table->decimal('lot_amount', 15, 2)->default(0)->after('received_type')->comment('whole amount of this MR no');
            $table->decimal('discount', 15, 2)->default(0)->after('amount');
            $table->decimal('vds', 15, 2)->default(0)->after('discount');
            $table->decimal('tds', 15, 2)->default(0)->after('vds');
            $table->decimal('prev_received_amount', 15, 2)->default(0)->after('bill_amount');
            $table->decimal('receivable_amount', 15, 2)->default(0)->after('prev_received_amount');
            $table->string('bank_name')->nullable()->after('receivable_amount');
            $table->string('customer_bank_name')->nullable()->after('bank_name');
            $table->string('cheque_no')->nullable()->after('customer_bank_name');
            $table->date('cheque_date')->nullable()->after('cheque_no');
            $table->string('remarks')->nullable()->after('cheque_date');
            $table->foreignId('deleted_by')->nullable()->after('created_by')->constrained('users');
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->index('sl_no');
            $table->decimal('lot_amount', 15, 2)->default(0)->after('payment_type')->comment('whole amount of this PR no');
            $table->decimal('discount', 15, 2)->default(0)->after('amount');
            $table->decimal('prev_paid_amount', 15, 2)->default(0)->after('bill_amount');
            $table->decimal('receivable_amount', 15, 2)->default(0)->after('prev_paid_amount');
            $table->string('supplier_mr_no')->nullable()->after('receivable_amount');
            $table->string('supplier_bill_no')->nullable()->after('supplier_mr_no');
            $table->string('bank_name')->nullable()->after('supplier_bill_no');
            $table->string('cheque_no')->nullable()->after('bank_name');
            $table->date('cheque_date')->nullable()->after('cheque_no');
        });

        // receipts made before this change: the lot is the line amount
        DB::table('money_receipts')->update(['lot_amount' => DB::raw('amount')]);
        DB::table('supplier_payments')->update(['lot_amount' => DB::raw('amount')]);
    }

    public function down(): void
    {
        Schema::table('money_receipts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropIndex(['mr_no']);
            $table->dropColumn(['lot_amount', 'discount', 'vds', 'tds', 'prev_received_amount', 'receivable_amount',
                'bank_name', 'customer_bank_name', 'cheque_no', 'cheque_date', 'remarks']);
            $table->unique('mr_no');
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropIndex(['sl_no']);
            $table->dropColumn(['lot_amount', 'discount', 'prev_paid_amount', 'receivable_amount',
                'supplier_mr_no', 'supplier_bill_no', 'bank_name', 'cheque_no', 'cheque_date']);
        });
    }
};
