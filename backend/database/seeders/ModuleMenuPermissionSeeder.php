<?php

namespace Database\Seeders;

use App\Models\authorization\Menu;
use App\Models\authorization\Module;
use App\Models\authorization\SubMenu;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class ModuleMenuPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Role
        $userRoleModule = Module::updateOrCreate(
            ['name' => 'User Role'],
            ['slug' => 'user-role']
        );
        $roleMenu = Menu::updateOrCreate(
            ['name' => 'Role', 'module_id' => $userRoleModule->id],
            ['slug' => 'role']
        );
//        $subMenu = SubMenu::updateOrCreate(
//            ['name' => 'Create', 'menu_id' => $menu->id],
//            ['slug' => 'create']
//        );
        Permission::updateOrCreate(
            ['name' => 'role.create', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $roleMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'role.view', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $roleMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'role.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $roleMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'role.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $roleMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'role.assign-permissions', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $roleMenu->id,
                'sub_menu_id' => null,
            ]
        );


        // Permission

        $permissionMenu = Menu::updateOrCreate(
            ['name' => 'Permission', 'module_id' => $userRoleModule->id],
            ['slug' => 'permission']
        );
        Permission::updateOrCreate(
            ['name' => 'permission.create', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $permissionMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'permission.view', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $permissionMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'permission.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $permissionMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'permission.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $permissionMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // User

        $userMenu = Menu::updateOrCreate(
            ['name' => 'User', 'module_id' => $userRoleModule->id],
            ['slug' => 'user']
        );
//        $userSubMenu = SubMenu::updateOrCreate(
//            ['name' => 'Manage User', 'module_id' => $userRoleModule->id, 'menu_id' => $userMenu->id],
//            ['slug' => 'manage-user']
//        );
        Permission::updateOrCreate(
            ['name' => 'user.create', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $userMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'user.view', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $userMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'user.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $userMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'user.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $userMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'user.assign-permissions', 'guard_name' => 'web'],
            [
                'module_id'   => $userRoleModule->id,
                'menu_id'     => $userMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Soft Config module
        $softConfigModule = Module::updateOrCreate(
            ['name' => 'Soft Config'],
            ['slug' => 'soft-config']
        );
        $companyMenu = Menu::updateOrCreate(
            ['name' => 'Company', 'module_id' => $softConfigModule->id],
            ['slug' => 'company']
        );

        // Company
        Permission::updateOrCreate(
            ['name' => 'company.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $companyMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'company.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $companyMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'company.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $companyMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'company.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $companyMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Category
        $categoryMenu = Menu::updateOrCreate(
            ['name' => 'Category', 'module_id' => $softConfigModule->id],
            ['slug' => 'category']
        );
        Permission::updateOrCreate(
            ['name' => 'category.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $categoryMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'category.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $categoryMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'category.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $categoryMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'category.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $categoryMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // sub-category
        $subCategoryMenu = Menu::updateOrCreate(
            ['name' => 'Sub Category', 'module_id' => $softConfigModule->id],
            ['slug' => 'sub-category']
        );
        Permission::updateOrCreate(
            ['name' => 'sub-category.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $subCategoryMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'sub-category.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $subCategoryMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'sub-category.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $subCategoryMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'sub-category.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $subCategoryMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // brand
        $brandMenu = Menu::updateOrCreate(
            ['name' => 'Brand', 'module_id' => $softConfigModule->id],
            ['slug' => 'brand']
        );
        Permission::updateOrCreate(
            ['name' => 'brand.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $brandMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'brand.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $brandMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'brand.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $brandMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'brand.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $brandMenu->id,
                'sub_menu_id' => null,
            ]
        );


        // Model
        $modelMenu = Menu::updateOrCreate(
            ['name' => 'Model', 'module_id' => $softConfigModule->id],
            ['slug' => 'model']
        );
        Permission::updateOrCreate(
            ['name' => 'model.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $modelMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'model.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $modelMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'model.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $modelMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'model.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $modelMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Unit
        $unitMenu = Menu::updateOrCreate(
            ['name' => 'Unit', 'module_id' => $softConfigModule->id],
            ['slug' => 'unit']
        );
        Permission::updateOrCreate(
            ['name' => 'unit.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $unitMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'unit.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $unitMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'unit.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $unitMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'unit.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $unitMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Store
        $storeMenu = Menu::updateOrCreate(
            ['name' => 'Store', 'module_id' => $softConfigModule->id],
            ['slug' => 'store']
        );
        Permission::updateOrCreate(
            ['name' => 'store.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $storeMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'store.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $storeMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'store.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $storeMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'store.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $storeMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Location
        $locationMenu = Menu::updateOrCreate(
            ['name' => 'Location', 'module_id' => $softConfigModule->id],
            ['slug' => 'location']
        );
        Permission::updateOrCreate(
            ['name' => 'location.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $locationMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'location.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $locationMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'location.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $locationMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'location.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $locationMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // PP/SP Setup (price code)
        $ppSpSetupMenu = Menu::updateOrCreate(
            ['name' => 'PP/SP Setup', 'module_id' => $softConfigModule->id],
            ['slug' => 'pp-sp-setup']
        );
        foreach (['create', 'view', 'edit', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "pp-sp-setup.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $softConfigModule->id,
                    'menu_id'     => $ppSpSetupMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Scroll Number Setup (month / year / prefix codes)
        $scrollSetupMenu = Menu::updateOrCreate(
            ['name' => 'Scroll Number Setup', 'module_id' => $softConfigModule->id],
            ['slug' => 'scroll-setup']
        );
        foreach (['view', 'edit'] as $action) {
            Permission::updateOrCreate(
                ['name' => "scroll-setup.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $softConfigModule->id,
                    'menu_id'     => $scrollSetupMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Purchase Price and Sale Price of products
        foreach (['Purchase Price' => 'purchase-price', 'Sale Price' => 'sell-price'] as $menuName => $slug) {
            $priceMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $softConfigModule->id],
                ['slug' => $slug]
            );
            foreach (['view', 'create'] as $action) {
                Permission::updateOrCreate(
                    ['name' => "{$slug}.{$action}", 'guard_name' => 'web'],
                    [
                        'module_id'   => $softConfigModule->id,
                        'menu_id'     => $priceMenu->id,
                        'sub_menu_id' => null,
                    ]
                );
            }
        }

        // Lookup
        $lookupMenu = Menu::updateOrCreate(
            ['name' => 'Lookup', 'module_id' => $softConfigModule->id],
            ['slug' => 'lookup']
        );
        Permission::updateOrCreate(
            ['name' => 'lookup.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $lookupMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'lookup.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $lookupMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'lookup.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $lookupMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'lookup.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $lookupMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Product
        $productMenu = Menu::updateOrCreate(
            ['name' => 'Products', 'module_id' => $softConfigModule->id],
            ['slug' => 'products']
        );
        Permission::updateOrCreate(
            ['name' => 'product.create', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $productMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'product.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $productMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'product.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $productMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'product.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $productMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Product Report (view only)
        $productReportMenu = Menu::updateOrCreate(
            ['name' => 'Product Report', 'module_id' => $softConfigModule->id],
            ['slug' => 'product-report']
        );
        Permission::updateOrCreate(
            ['name' => 'product-report.view', 'guard_name' => 'web'],
            [
                'module_id'   => $softConfigModule->id,
                'menu_id'     => $productReportMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Purchase module
        $purchaseModule = Module::updateOrCreate(
            ['name' => 'Purchase'],
            ['slug' => 'purchase']
        );
        $supplierMenu = Menu::updateOrCreate(
            ['name' => 'Suppliers', 'module_id' => $purchaseModule->id],
            ['slug' => 'suppliers']
        );

        // Company
        Permission::updateOrCreate(
            ['name' => 'supplier.create', 'guard_name' => 'web'],
            [
                'module_id'   => $purchaseModule->id,
                'menu_id'     => $supplierMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'supplier.view', 'guard_name' => 'web'],
            [
                'module_id'   => $purchaseModule->id,
                'menu_id'     => $supplierMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'supplier.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $purchaseModule->id,
                'menu_id'     => $supplierMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'supplier.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $purchaseModule->id,
                'menu_id'     => $supplierMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Sales module
        // Purchase (direct purchase like parts_bazar)
        $purchaseMenu = Menu::updateOrCreate(
            ['name' => 'Purchase', 'module_id' => $purchaseModule->id],
            ['slug' => 'purchase']
        );
        foreach (['create', 'view', 'edit', 'delete', 'approve'] as $action) {
            Permission::updateOrCreate(
                ['name' => "purchase.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $purchaseModule->id,
                    'menu_id'     => $purchaseMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Purchase Return
        $purchaseReturnMenu = Menu::updateOrCreate(
            ['name' => 'Purchase Return', 'module_id' => $purchaseModule->id],
            ['slug' => 'purchase-return']
        );
        foreach (['create', 'view', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "purchase-return.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $purchaseModule->id,
                    'menu_id'     => $purchaseReturnMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Supplier Payment
        $supplierPaymentMenu = Menu::updateOrCreate(
            ['name' => 'Supplier Payment', 'module_id' => $purchaseModule->id],
            ['slug' => 'supplier-payment']
        );
        foreach (['create', 'view', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "supplier-payment.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $purchaseModule->id,
                    'menu_id'     => $supplierPaymentMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Purchase reports (view only)
        $purchaseReports = [
            'Purchase Report' => 'purchase-report',
            'Purchase Summary Report' => 'purchase-summary-report',
            'Purchase Return Report' => 'purchase-return-report',
            'Payment Report' => 'payment-report',
            'Supplier (Ledger)' => 'supplier-ledger-report',
            'Supplier (Ledger) Summary' => 'supplier-ledger-summary-report',
            'Supplier Due Report' => 'supplier-due-report',
            'Supplier Info Report' => 'supplier-info-report',
        ];
        foreach ($purchaseReports as $menuName => $slug) {
            $reportMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $purchaseModule->id],
                ['slug' => $slug]
            );
            Permission::updateOrCreate(
                ['name' => "{$slug}.view", 'guard_name' => 'web'],
                [
                    'module_id'   => $purchaseModule->id,
                    'menu_id'     => $reportMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Inventory module
        $inventoryModule = Module::updateOrCreate(
            ['name' => 'Inventory'],
            ['slug' => 'inventory']
        );
        foreach (['Inventory Stock' => 'inventory-stock', 'Inventory Barcode' => 'inventory-barcode'] as $menuName => $slug) {
            $inventoryMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $inventoryModule->id],
                ['slug' => $slug]
            );
            // Inventory Stock also has the manual stock in / out (parts_bazar inventory/create) and its delete
            $actions = ['view'];
            if ($slug == 'inventory-stock') {
                $actions = ['view', 'create', 'delete'];
            }
            foreach ($actions as $action) {
                Permission::updateOrCreate(
                    ['name' => "{$slug}.{$action}", 'guard_name' => 'web'],
                    [
                        'module_id'   => $inventoryModule->id,
                        'menu_id'     => $inventoryMenu->id,
                        'sub_menu_id' => null,
                    ]
                );
            }
        }
        // Short List Order
        $shortListMenu = Menu::updateOrCreate(
            ['name' => 'Short List Order', 'module_id' => $inventoryModule->id],
            ['slug' => 'short-list-order']
        );
        foreach (['create', 'view', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "short-list-order.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $inventoryModule->id,
                    'menu_id'     => $shortListMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }
        // Stock Transfer
        $stockTransferMenu = Menu::updateOrCreate(
            ['name' => 'Stock Transfer', 'module_id' => $inventoryModule->id],
            ['slug' => 'stock-transfer']
        );
        foreach (['create', 'view', 'edit', 'delete', 'approve'] as $action) {
            Permission::updateOrCreate(
                ['name' => "stock-transfer.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $inventoryModule->id,
                    'menu_id'     => $stockTransferMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }
        // Audit Name Setup and Inventory Audit
        foreach (['Audit Name Setup' => 'audit-name', 'Inventory Audit' => 'inventory-audit'] as $menuName => $slug) {
            $auditMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $inventoryModule->id],
                ['slug' => $slug]
            );
            foreach (['create', 'view', 'edit', 'delete'] as $action) {
                Permission::updateOrCreate(
                    ['name' => "{$slug}.{$action}", 'guard_name' => 'web'],
                    [
                        'module_id'   => $inventoryModule->id,
                        'menu_id'     => $auditMenu->id,
                        'sub_menu_id' => null,
                    ]
                );
            }
        }
        // Inventory reports (view only)
        $reports = [
            'Stock Qty Report' => 'stock-qty-report',
            'Stock Amount Report' => 'stock-amount-report',
            'Alert Quantity Report' => 'alert-qty-report',
            'Out Of Stock Report' => 'out-of-stock-report',
        ];
        foreach ($reports as $menuName => $slug) {
            $reportMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $inventoryModule->id],
                ['slug' => $slug]
            );
            Permission::updateOrCreate(
                ['name' => "{$slug}.view", 'guard_name' => 'web'],
                [
                    'module_id'   => $inventoryModule->id,
                    'menu_id'     => $reportMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        $salesModule = Module::updateOrCreate(
            ['name' => 'Sales'],
            ['slug' => 'sales']
        );
        // Sales (sell items like parts_bazar)
        $saleMenu = Menu::updateOrCreate(
            ['name' => 'Sales', 'module_id' => $salesModule->id],
            ['slug' => 'sales']
        );
        foreach (['create', 'view', 'edit', 'delete', 'approve'] as $action) {
            Permission::updateOrCreate(
                ['name' => "sale.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $salesModule->id,
                    'menu_id'     => $saleMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Sales Return
        $saleReturnMenu = Menu::updateOrCreate(
            ['name' => 'Sales Return', 'module_id' => $salesModule->id],
            ['slug' => 'sale-return']
        );
        foreach (['create', 'view', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "sale-return.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $salesModule->id,
                    'menu_id'     => $saleReturnMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Money Receipt
        $moneyReceiptMenu = Menu::updateOrCreate(
            ['name' => 'Money Receipt', 'module_id' => $salesModule->id],
            ['slug' => 'money-receipt']
        );
        foreach (['create', 'view', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "money-receipt.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $salesModule->id,
                    'menu_id'     => $moneyReceiptMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        $customerMenu = Menu::updateOrCreate(
            ['name' => 'Customers', 'module_id' => $salesModule->id],
            ['slug' => 'customers']
        );

        // Company
        Permission::updateOrCreate(
            ['name' => 'customer.create', 'guard_name' => 'web'],
            [
                'module_id'   => $salesModule->id,
                'menu_id'     => $customerMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'customer.view', 'guard_name' => 'web'],
            [
                'module_id'   => $salesModule->id,
                'menu_id'     => $customerMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'customer.edit', 'guard_name' => 'web'],
            [
                'module_id'   => $salesModule->id,
                'menu_id'     => $customerMenu->id,
                'sub_menu_id' => null,
            ]
        );
        Permission::updateOrCreate(
            ['name' => 'customer.delete', 'guard_name' => 'web'],
            [
                'module_id'   => $salesModule->id,
                'menu_id'     => $customerMenu->id,
                'sub_menu_id' => null,
            ]
        );

        // Customers Contact (phone book)
        $customerContactMenu = Menu::updateOrCreate(
            ['name' => 'Customers Contact', 'module_id' => $salesModule->id],
            ['slug' => 'customers-contact']
        );
        foreach (['create', 'view', 'edit', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "customer-contact.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $salesModule->id,
                    'menu_id'     => $customerContactMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }
        // Sales reports (view only)
        $reports = [
            'Sales Report' => 'sales-report',
            'Sales Summary Report' => 'sales-summary-report',
            'Sales Return Report' => 'sales-return-report',
            'Collection Report' => 'collection-report',
            'Invoice Wise Collection Report' => 'invoice-wise-collection-report',
            'Customer Due Report' => 'customer-due-report',
            'Customer Ledger Report' => 'customer-ledger-report',
            'Customer Ledger Summary Report' => 'customer-ledger-summary-report',
            'Customer Info Report' => 'customer-info-report',
        ];
        foreach ($reports as $menuName => $slug) {
            $reportMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $salesModule->id],
                ['slug' => $slug]
            );
            Permission::updateOrCreate(
                ['name' => "{$slug}.view", 'guard_name' => 'web'],
                [
                    'module_id'   => $salesModule->id,
                    'menu_id'     => $reportMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Accounting module
        $accountingModule = Module::updateOrCreate(
            ['name' => 'Accounting'],
            ['slug' => 'accounting']
        );

        // Chart of Accounts
        $chartOfAcMenu = Menu::updateOrCreate(
            ['name' => 'Chart Of Ac', 'module_id' => $accountingModule->id],
            ['slug' => 'chart-of-ac']
        );
        foreach (['create', 'view', 'edit', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "chart-of-ac.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $accountingModule->id,
                    'menu_id'     => $chartOfAcMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Chart Of AC Opening and Currency (conversion rate in BDT)
        $accountingMenus = [
            'Chart Of AC Opening' => 'chart-of-ac-opening',
            'Currency' => 'currency-conversion',
        ];
        foreach ($accountingMenus as $menuName => $slug) {
            $accountingMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $accountingModule->id],
                ['slug' => $slug]
            );
            foreach (['create', 'view', 'edit', 'delete'] as $action) {
                Permission::updateOrCreate(
                    ['name' => "{$slug}.{$action}", 'guard_name' => 'web'],
                    [
                        'module_id'   => $accountingModule->id,
                        'menu_id'     => $accountingMenu->id,
                        'sub_menu_id' => null,
                    ]
                );
            }
        }

        // Voucher Type: the types are fixed, so only view and edit (same as parts_bazar)
        $voucherTypeMenu = Menu::updateOrCreate(
            ['name' => 'Voucher Type', 'module_id' => $accountingModule->id],
            ['slug' => 'voucher-type']
        );
        foreach (['view', 'edit'] as $action) {
            Permission::updateOrCreate(
                ['name' => "voucher-type.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $accountingModule->id,
                    'menu_id'     => $voucherTypeMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Voucher Entry (create) and Voucher Manage (view, edit, delete) share one menu
        $voucherEntryMenu = Menu::updateOrCreate(
            ['name' => 'Voucher Entry', 'module_id' => $accountingModule->id],
            ['slug' => 'voucher-entry']
        );
        foreach (['create', 'view', 'edit', 'delete'] as $action) {
            Permission::updateOrCreate(
                ['name' => "voucher-entry.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $accountingModule->id,
                    'menu_id'     => $voucherEntryMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // Cost Category and Cost Center: add and update only, no delete (same as parts_bazar)
        $costMenus = ['Cost Category' => 'cost-category', 'Cost Center' => 'cost-center'];
        foreach ($costMenus as $menuName => $slug) {
            $costMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $accountingModule->id],
                ['slug' => $slug]
            );
            foreach (['view', 'create', 'edit'] as $action) {
                Permission::updateOrCreate(
                    ['name' => "{$slug}.{$action}", 'guard_name' => 'web'],
                    [
                        'module_id'   => $accountingModule->id,
                        'menu_id'     => $costMenu->id,
                        'sub_menu_id' => null,
                    ]
                );
            }
        }

        // Cheque Book: add a book, update / cancel a leaf (edit), delete a whole book
        $chequeBookMenus = [
            'Cheque Book' => ['slug' => 'cheque-book', 'actions' => ['view', 'create', 'edit', 'delete']],
            'Cheque Book Delete History' => ['slug' => 'cheque-book-delete-history', 'actions' => ['view']],
            // the register of the cheques written by the vouchers; edit = set the clearance date
            'Cheque Entry' => ['slug' => 'cheque-entry', 'actions' => ['view', 'edit']],
        ];
        foreach ($chequeBookMenus as $menuName => $setting) {
            $chequeMenu = Menu::updateOrCreate(
                ['name' => $menuName, 'module_id' => $accountingModule->id],
                ['slug' => $setting['slug']]
            );
            foreach ($setting['actions'] as $action) {
                Permission::updateOrCreate(
                    ['name' => $setting['slug'] . '.' . $action, 'guard_name' => 'web'],
                    [
                        'module_id'   => $accountingModule->id,
                        'menu_id'     => $chequeMenu->id,
                        'sub_menu_id' => null,
                    ]
                );
            }
        }

        // Voucher Signatory Setup: add and update only, no delete (same as parts_bazar)
        $signatoryMenu = Menu::updateOrCreate(
            ['name' => 'Voucher Signatory Setup', 'module_id' => $accountingModule->id],
            ['slug' => 'voucher-signatory']
        );
        foreach (['view', 'create', 'edit'] as $action) {
            Permission::updateOrCreate(
                ['name' => "voucher-signatory.{$action}", 'guard_name' => 'web'],
                [
                    'module_id'   => $accountingModule->id,
                    'menu_id'     => $signatoryMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        // the base heads of the Chart of Accounts and the BDT rate
        $this->call(ChartOfAcSeeder::class);

        // the 6 voucher types with the parts_bazar formats
        $this->call(VoucherTypeSeeder::class);
    }
}
