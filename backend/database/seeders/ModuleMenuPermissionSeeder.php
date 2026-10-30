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
            Permission::updateOrCreate(
                ['name' => "{$slug}.view", 'guard_name' => 'web'],
                [
                    'module_id'   => $inventoryModule->id,
                    'menu_id'     => $inventoryMenu->id,
                    'sub_menu_id' => null,
                ]
            );
        }

        $salesModule = Module::updateOrCreate(
            ['name' => 'Sales'],
            ['slug' => 'sales']
        );
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
    }
}
