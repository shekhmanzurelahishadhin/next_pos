<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Copies master data from the old parts_bazar database into this POS.
 * Safe to run again: rows that already exist (same name / part number / phone) are skipped.
 *
 *   php artisan import:parts-bazar
 */
class ImportPartsBazar extends Command
{
    protected $signature = 'import:parts-bazar {--company= : POS company id that gets the data (default: first company)}';

    protected $description = 'Import master data (products, customers, suppliers ...) from the old parts_bazar database';

    private $old;
    private int $companyId;
    private ?int $userId;

    // old id => new id
    private array $categories = [];
    private array $subCategories = [];
    private array $brands = [];
    private array $units = [];
    private array $stores = [];

    public function handle()
    {
        $this->old = DB::connection('parts_bazar');
        $this->companyId = (int) ($this->option('company') ?: DB::table('companies')->orderBy('id')->value('id'));
        $this->userId = DB::table('users')->orderBy('id')->value('id');

        if (!$this->companyId) {
            $this->error('Create a company in the POS first.');
            return self::FAILURE;
        }

        DB::transaction(function () {
            $this->importCategories();
            $this->importSubCategories();
            $this->importBrands();
            $this->importUnits();
            $this->importStores();
            $this->importLocations();
            $this->importProducts();
            $this->importSuppliers();
            $this->importCustomers();
            $this->importCustomerContacts();
            $this->importPpSpSetups();
        });

        $this->info('Import finished.');
        return self::SUCCESS;
    }

    private function importCategories()
    {
        $added = 0;
        foreach ($this->old->table('prod_items')->get() as $row) {
            $name = trim($row->item_name);
            $id = DB::table('categories')->where('name', $name)->value('id');
            if (!$id) {
                $id = DB::table('categories')->insertGetId($this->audit($row, [
                    'name' => $name, 'slug' => $this->uniqueSlug('categories', $name), 'status' => 1,
                ]));
                $added++;
            }
            $this->categories[$row->id] = $id;
        }
        $this->line("Categories: {$added} added");
    }

    // parts_bazar "prod_brands" are sub-categories (Engine, Brake ...) under a category
    private function importSubCategories()
    {
        $added = 0;
        foreach ($this->old->table('prod_brands')->get() as $row) {
            $categoryId = $this->categories[$row->item_id] ?? null;
            if (!$categoryId) continue;

            $name = trim($row->brand_name);
            $id = DB::table('sub_categories')->where(['category_id' => $categoryId, 'name' => $name])->value('id');
            if (!$id) {
                $id = DB::table('sub_categories')->insertGetId($this->audit($row, [
                    'category_id' => $categoryId, 'name' => $name,
                    'slug' => $this->uniqueSlug('sub_categories', $name), 'status' => 1,
                ]));
                $added++;
            }
            $this->subCategories[$row->id] = $id;
        }
        $this->line("Sub-categories: {$added} added");
    }

    // parts_bazar "p_brand" (Mitsubishi ...) is the product brand
    private function importBrands()
    {
        $added = 0;
        foreach ($this->old->table('p_brand')->get() as $row) {
            $name = trim($row->name);
            $id = DB::table('brands')->where('name', $name)->value('id');
            if (!$id) {
                $id = DB::table('brands')->insertGetId($this->audit($row, [
                    'name' => $name, 'slug' => $this->uniqueSlug('brands', $name), 'status' => 1,
                ]));
                $added++;
            }
            $this->brands[$row->id] = $id;
        }
        $this->line("Brands: {$added} added");
    }

    private function importUnits()
    {
        $added = 0;
        foreach ($this->old->table('units')->get() as $row) {
            $name = trim($row->label);
            // PCS, Pcs and Pc are the same unit
            $code = strtoupper($name) === 'PC' ? 'PCS' : strtoupper($name);
            $id = DB::table('units')->where('code', $code)->value('id');
            if (!$id) {
                $id = DB::table('units')->insertGetId($this->audit($row, [
                    'name' => $name, 'code' => $code, 'slug' => $this->uniqueSlug('units', $name), 'status' => 1,
                ]));
                $added++;
            }
            $this->units[$row->id] = $id;
        }
        $this->line("Units: {$added} added");
    }

    private function importStores()
    {
        $added = 0;
        foreach ($this->old->table('stores')->get() as $row) {
            $name = trim($row->store_name);
            $id = DB::table('stores')->where('name', $name)->value('id');
            if (!$id) {
                $id = DB::table('stores')->insertGetId($this->audit($row, [
                    'company_id' => $this->companyId, 'name' => $name, 'address' => trim((string) $row->location),
                    'slug' => $this->uniqueSlug('stores', $name),
                    'code' => generateCode('STR', 'stores', 'code'), 'status' => 1,
                ]));
                $added++;
            }
            $this->stores[$row->id] = $id;
        }
        $this->line("Stores: {$added} added");
    }

    private function importLocations()
    {
        $added = 0;
        foreach ($this->old->table('location')->get() as $row) {
            $storeId = $this->stores[$row->stores_id] ?? null;
            if (!$storeId) continue;

            $name = trim($row->title);
            if (DB::table('locations')->where(['store_id' => $storeId, 'name' => $name])->exists()) continue;

            DB::table('locations')->insert($this->audit($row, [
                'company_id' => $this->companyId, 'store_id' => $storeId, 'name' => $name,
                'description' => trim((string) $row->details) ?: null,
                'code' => generateCode('LOC', 'locations', 'code'), 'status' => 1,
            ]));
            $added++;
        }
        $this->line("Locations: {$added} added");
    }

    private function importProducts()
    {
        $added = 0;
        // supported models, engine and chassis are kept in a side table
        $extra = $this->old->table('custom_prod_fields')->get()->keyBy('prod_id');

        foreach ($this->old->table('prod_models')->get() as $row) {
            $partNumber = trim($row->code);
            if (DB::table('products')->where('part_number', $partNumber)->exists()) continue;

            $categoryId = $this->categories[$row->item_id] ?? null;
            $brandId = $this->brands[$row->pbrand] ?? null;
            if (!$categoryId || !$brandId) {
                $this->warn("Product {$partNumber} skipped: no category or brand");
                continue;
            }

            $more = $extra[$row->id] ?? null;
            DB::table('products')->insert($this->audit($row, [
                'company_id'          => $this->companyId,
                'name'                => trim($row->model_name),
                'part_number'         => $partNumber,
                'product_category_id' => $categoryId,
                'sub_category_id'     => $this->subCategories[$row->brand_id] ?? null,
                'brand_id'            => $brandId,
                'unit_id'             => $this->units[$row->unit_id] ?? null,
                'min_order_qty'       => $row->min_order_qty,
                'short_list_qty'      => $row->short_list_qty,
                'warranty'            => $row->warranty,
                'features'            => $row->features,
                'year_models'         => $row->year_model,
                'supported_models'    => $this->clean($more->car_model_1 ?? null),
                'engine'              => $this->clean($more->engine_1 ?? null),
                'chassis'             => $this->clean($more->chassis_1 ?? null),
                'status'              => $row->is_active ? 1 : 0,
            ]));
            $added++;
        }
        $this->line("Products: {$added} added");
    }

    private function importSuppliers()
    {
        $added = 0;
        foreach ($this->old->table('suppliers')->get() as $row) {
            $name = trim($row->company_name);
            $phone = $this->clean($row->company_contact_no);
            if (DB::table('suppliers')->where(['name' => $name, 'phone' => $phone])->exists()) continue;

            // supplier opening amount is what we owe them, so it is a credit balance
            $opening = (float) $row->opening_amount;
            DB::table('suppliers')->insert($this->audit($row, [
                'name' => $name, 'slug' => $this->uniqueSlug('suppliers', $name),
                'code' => generateCode('SUP', 'suppliers', 'code'),
                'phone' => $phone, 'email' => $this->clean($row->company_email),
                'address' => $this->clean($row->company_address),
                'opening_balance' => abs($opening), 'opening_balance_type' => $opening < 0 ? '1' : '2',
                'status' => 1,
            ]));
            $added++;
        }
        $this->line("Suppliers: {$added} added");
    }

    private function importCustomers()
    {
        $added = 0;
        foreach ($this->old->table('customers')->orderBy('id')->get() as $row) {
            $name = trim($row->company_name);
            $phone = $this->clean($row->company_contact_no);
            $address = $this->clean($row->company_address);
            if (DB::table('customers')->where(['name' => $name, 'phone' => $phone, 'address' => $address])->exists()) continue;

            // customer opening amount is what they owe us, so it is a debit balance
            $opening = (float) $row->opening_amount;
            DB::table('customers')->insert($this->audit($row, [
                'company_id' => $this->companyId,
                'name' => $name, 'slug' => $this->uniqueSlug('customers', $name),
                'code' => generateCode('CUS', 'customers', 'code'),
                'store_id' => $this->stores[$row->depot_id] ?? null,
                'phone' => $phone, 'fax' => $this->clean($row->company_fax),
                'email' => $this->clean($row->company_email), 'website' => $this->clean($row->company_web),
                'address' => $address, 'car_name' => $this->clean($row->car_name),
                'opening_balance' => abs($opening), 'opening_balance_type' => $opening < 0 ? '2' : '1',
                'credit_limit' => $row->due_limits ?: 0,
                'status' => 1,
            ]));
            $added++;
        }
        $this->line("Customers: {$added} added");
    }

    private function importCustomerContacts()
    {
        $added = 0;
        foreach ($this->old->table('customers_contact')->get() as $row) {
            $name = trim($row->customer_name);
            $phone = trim((string) $row->contact_one);
            if (DB::table('customers_contact')->where(['customer_name' => $name, 'contact_one' => $phone])->exists()) continue;

            DB::table('customers_contact')->insert($this->audit($row, [
                'company_id' => $this->companyId,
                'district' => trim((string) $row->district), 'customer_name' => $name, 'contact_one' => $phone,
                'contact_two' => $this->clean($row->contact_two), 'contact_three' => $this->clean($row->contact_three),
                'remarks' => $this->clean($row->remarks),
            ]));
            $added++;
        }
        $this->line("Customer contacts: {$added} added");
    }

    // parts_bazar keeps one row per digit; here one row holds all 10 codes
    private function importPpSpSetups()
    {
        $added = 0;
        $sets = $this->old->table('pp_sp_setup')->orderBy('digit')->get()->groupBy(fn($row) => $row->sl_no . '-' . $row->type);

        foreach ($sets as $rows) {
            $first = $rows->first();
            $codes = array_fill(0, 10, '');
            foreach ($rows as $row) {
                $codes[(int) $row->digit] = (string) $row->value;
            }
            $json = json_encode($codes);
            if (DB::table('pp_sp_setups')->where('type', $first->type)->where('codes', $json)->exists()) continue;

            DB::table('pp_sp_setups')->insert([
                'type' => $first->type, 'codes' => $json, 'status' => $first->status ? 1 : 0,
                'created_by' => $this->userId, 'created_at' => $first->created_time ?? now(), 'updated_at' => now(),
            ]);
            $added++;
        }
        $this->line("PP/SP setups: {$added} added");
    }

    // created_by / dates for a new row
    private function audit($row, array $data): array
    {
        return $data + [
            'created_by' => $this->userId,
            'created_at' => $row->created_at ?? now(),
            'updated_at' => $row->updated_at ?? $row->created_at ?? now(),
        ];
    }

    private function clean($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }

    // slug from the name; adds -2, -3 ... when the name is used already
    private function uniqueSlug(string $table, string $name): string
    {
        $base = Str::slug($name) ?: 'item';
        $slug = $base;
        for ($i = 2; DB::table($table)->where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }
        return $slug;
    }
}
