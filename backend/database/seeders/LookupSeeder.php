<?php

namespace Database\Seeders;

use App\Models\softConfig\Lookup;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class LookupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $lookups = [
            // Status types with manual codes
            ['name' => 'Active',   'type' => 'active_status', 'code' => 1],
            ['name' => 'Inactive', 'type' => 'active_status', 'code' => 0],

            ['name' => 'Pending',  'type' => 'status', 'code' => 1],
            ['name' => 'Approved',  'type' => 'status', 'code' => 2],

            // Units with manual codes
            ['name' => 'Piece', 'type' => 'unit', 'code' => 1],
            ['name' => 'Kg',    'type' => 'unit', 'code' => 2],
            ['name' => 'Litre', 'type' => 'unit', 'code' => 3],

            ['name' => 'Debit',  'type' => 'transaction_type', 'code' => 1],
            ['name' => 'Credit', 'type' => 'transaction_type', 'code' => 2],

            // Vehicle brands for products
            ['name' => 'Toyota',     'type' => 'vehicle_brand', 'code' => 1],
            ['name' => 'Nissan',     'type' => 'vehicle_brand', 'code' => 2],
            ['name' => 'Honda',      'type' => 'vehicle_brand', 'code' => 3],
            ['name' => 'Mitsubishi', 'type' => 'vehicle_brand', 'code' => 4],
            ['name' => 'Suzuki',     'type' => 'vehicle_brand', 'code' => 5],

            // Product origin countries
            ['name' => 'Japan',    'type' => 'country', 'code' => 1],
            ['name' => 'China',    'type' => 'country', 'code' => 2],
            ['name' => 'India',    'type' => 'country', 'code' => 3],
            ['name' => 'Thailand', 'type' => 'country', 'code' => 4],
            ['name' => 'Taiwan',   'type' => 'country', 'code' => 5],

            // Customer types
            ['name' => 'Retail',    'type' => 'customer_type', 'code' => 1],
            ['name' => 'Wholesale', 'type' => 'customer_type', 'code' => 2],
            ['name' => 'Workshop',  'type' => 'customer_type', 'code' => 3],
            ['name' => 'Dealer',    'type' => 'customer_type', 'code' => 4],

            // Purchase form (same as parts_bazar)
            ['name' => 'Cash', 'type' => 'cash_due', 'code' => 1],
            ['name' => 'Due',  'type' => 'cash_due', 'code' => 2],

            ['name' => 'Local',          'type' => 'local_import', 'code' => 1],
            ['name' => 'Import',         'type' => 'local_import', 'code' => 2],
            ['name' => 'Local Importer', 'type' => 'local_import', 'code' => 3],

            ['name' => 'Cash',              'type' => 'payment_type', 'code' => 1],
            ['name' => 'Cheque',            'type' => 'payment_type', 'code' => 2],
            ['name' => 'Deposit Into Bank', 'type' => 'payment_type', 'code' => 3],
            ['name' => 'Card',              'type' => 'payment_type', 'code' => 4],

            ['name' => 'DHL',        'type' => 'ship_by', 'code' => 1],
            ['name' => 'Air Cargo',  'type' => 'ship_by', 'code' => 2],
            ['name' => 'By Hand',    'type' => 'ship_by', 'code' => 3],
            ['name' => 'Cover Van',  'type' => 'ship_by', 'code' => 4],
            ['name' => 'Hand Carry', 'type' => 'ship_by', 'code' => 5],
            ['name' => 'By Car',     'type' => 'ship_by', 'code' => 6],
            ['name' => 'Van Carry',  'type' => 'ship_by', 'code' => 7],
            ['name' => 'Sea Ship',   'type' => 'ship_by', 'code' => 8],
            ['name' => 'Pathao',     'type' => 'ship_by', 'code' => 9],
        ];

        foreach ($lookups as $lookup) {
            Lookup::updateOrInsert(
                [
                    'type' => $lookup['type'],
                    'code' => $lookup['code'], // unique condition
                ],
                [
                    'name'       => $lookup['name'],
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]
            );
        }
    }
}
