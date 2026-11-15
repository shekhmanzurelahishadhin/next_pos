<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // parts_bazar keeps the Alert QTY in prod_models.min_order_qty, but the import saved it
    // into products.min_order_qty. Move it to products.alert_qty
    // (only where no alert qty is set yet).
    public function up(): void
    {
        DB::table('products')
            ->whereNotNull('min_order_qty')
            ->whereNull('alert_qty')
            ->update([
                'alert_qty' => DB::raw('min_order_qty'),
                'min_order_qty' => null,
            ]);
    }

    public function down(): void
    {
        // the moved rows can not be told apart from alert qty typed later, so nothing is undone
    }
};
