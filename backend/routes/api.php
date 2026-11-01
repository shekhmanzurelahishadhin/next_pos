<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\auth\AuthController;
use App\Http\Controllers\api\UserController;
use App\Http\Controllers\api\authorization\RoleController;
use App\Http\Controllers\api\authorization\PermissionController;
use App\Http\Controllers\api\softConfig\CompanyController;
use App\Http\Controllers\api\softConfig\LookupController;
use App\Http\Controllers\api\softConfig\CategoryController;
use App\Http\Controllers\api\softConfig\SubCategoryController;
use App\Http\Controllers\api\softConfig\BrandController;
use App\Http\Controllers\api\softConfig\ProductModelController;
use App\Http\Controllers\api\softConfig\UnitController;
use App\Http\Controllers\api\softConfig\StoreController;
use App\Http\Controllers\api\softConfig\LocationController;
use App\Http\Controllers\api\softConfig\PpSpSetupController;
use App\Http\Controllers\api\softConfig\ScrollCodeController;
use App\Http\Controllers\api\purchase\SupplierController;
use App\Http\Controllers\api\purchase\PurchaseController;
use App\Http\Controllers\api\purchase\PurchaseReturnController;
use App\Http\Controllers\api\inventory\InventoryController;
use App\Http\Controllers\api\sales\CustomerController;
use App\Http\Controllers\api\sales\CustomersContactController;
use App\Http\Controllers\api\sales\SellPriceController;
use App\Http\Controllers\api\sales\SaleController;
use App\Http\Controllers\api\sales\SaleReturnController;
use App\Http\Controllers\api\sales\MoneyReceiptController;
use App\Http\Controllers\api\purchase\SupplierPaymentController;
use App\Http\Controllers\api\softConfig\ProductController;
use App\Http\Controllers\api\softConfig\PurchasePriceController;
use App\Http\Controllers\api\softConfig\ProductPriceController;
use App\Helpers\ApiResponse;


Route::prefix('v1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [UserController::class, 'user']);

        //user manage routes
        Route::prefix('users')->group(function () {
            // User management
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::put('/{user}', [UserController::class, 'update']);
            Route::delete('/{user}', [UserController::class, 'destroy']);

            // User permissions
            Route::get('/{user}/permissions', [UserController::class, 'getUserPermissions']);
            Route::post('/{user}/permissions', [UserController::class, 'assignPermissions']);
        });

        //Roles manage routes
        Route::prefix('roles')->group(function () {
            // Role Management
            Route::get('/', [RoleController::class, 'index']);       // list roles
            Route::post('/', [RoleController::class, 'store']);      // create role
            Route::put('/{role}', [RoleController::class, 'update']); // update role
            Route::delete('/{role}', [RoleController::class, 'destroy']); // delete role

            // Role permission
            Route::get('/{role}/permissions', [RoleController::class, 'getPermissions']); // fetch assigned
            Route::post('/{role}/permissions', [RoleController::class, 'assignPermissions']); // assign/update
        });

        //Permission manage routes
        Route::prefix('permissions')->group(function () {
            Route::get('/', [PermissionController::class, 'index']);
            Route::post('/', [PermissionController::class, 'store']);
            Route::put('/{permission}', [PermissionController::class, 'update']);
            Route::delete('/{permission}', [PermissionController::class, 'destroy']);
        });

        // Permission Module, Menu and Sub Menu
        Route::get('/modules', [PermissionController::class, 'modules']);
        Route::get('/menus', [PermissionController::class, 'menus']);
        Route::get('/sub-menus', [PermissionController::class, 'subMenus']);


        // Soft Config Route
        Route::prefix('configure')->group(function () {

            // Companies Route
            Route::prefix('companies')->group(function () {
                Route::get('/', [CompanyController::class, 'index']);
                Route::post('/', [CompanyController::class, 'store']);
                Route::get('/{company}', [CompanyController::class, 'show']);
                Route::put('/{company}', [CompanyController::class, 'update']);
                Route::post('trash/{company}', [CompanyController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [CompanyController::class, 'restore']);
                Route::delete('/{id}', [CompanyController::class, 'destroy']); // force delete
            });

            // Lookups Route
            Route::prefix('lookups')->group(function () {
                Route::get('/', [LookupController::class, 'index']);
                Route::post('/', [LookupController::class, 'store']);
                Route::put('/{lookup}', [LookupController::class, 'update']);
                Route::post('trash/{lookup}', [LookupController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [LookupController::class, 'restore']);
                Route::delete('/{id}', [LookupController::class, 'destroy']); // force delete
            });
            Route::get('/get-lookup-type/lists', [LookupController::class, 'getLookupTypeLists']);
            Route::get('/get-lookup-list/{type}', [LookupController::class, 'getLookupListByType']);

            // Categories Route
            Route::prefix('categories')->group(function () {
                Route::get('/', [CategoryController::class, 'index']);
                Route::post('/', [CategoryController::class, 'store']);
                Route::get('/{category}', [CategoryController::class, 'show']);
                Route::put('/{category}', [CategoryController::class, 'update']);
                Route::post('trash/{category}', [CategoryController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [CategoryController::class, 'restore']);
                Route::delete('/{id}', [CategoryController::class, 'destroy']); // force delete
            });

            // Sub Categories Route
            Route::prefix('sub-categories')->group(function () {
                Route::get('/', [SubCategoryController::class, 'index']);
                Route::post('/', [SubCategoryController::class, 'store']);
                Route::get('/{subCategory}', [SubCategoryController::class, 'show']);
                Route::put('/{subCategory}', [SubCategoryController::class, 'update']);
                Route::post('trash/{subCategory}', [SubCategoryController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [SubCategoryController::class, 'restore']);
                Route::delete('/{id}', [SubCategoryController::class, 'destroy']); // force delete
            });

            // Brands Route
            Route::prefix('brands')->group(function () {
                Route::get('/', [BrandController::class, 'index']);
                Route::post('/', [BrandController::class, 'store']);
                Route::get('/{brand}', [BrandController::class, 'show']);
                Route::put('/{brand}', [BrandController::class, 'update']);
                Route::post('trash/{brand}', [BrandController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [BrandController::class, 'restore']);
                Route::delete('/{id}', [BrandController::class, 'destroy']); // force delete
            });

            // Product Route
            Route::prefix('products')->group(function () {
                Route::get('/', [ProductController::class, 'index']);
                Route::get('/model-list', [ProductController::class, 'modelList']);
                Route::post('/', [ProductController::class, 'store']);
                Route::get('/{product}', [ProductController::class, 'show']);
                Route::put('/{product}', [ProductController::class, 'update']);
                Route::post('trash/{product}', [ProductController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [ProductController::class, 'restore']);
                Route::delete('/{id}', [ProductController::class, 'destroy']); // force delete
            });

            // Units Route
            Route::prefix('units')->group(function () {
                Route::get('/', [UnitController::class, 'index']);
                Route::post('/', [UnitController::class, 'store']);
                Route::get('/{unit}', [UnitController::class, 'show']);
                Route::put('/{unit}', [UnitController::class, 'update']);
                Route::post('trash/{unit}', [UnitController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [UnitController::class, 'restore']);
                Route::delete('/{id}', [UnitController::class, 'destroy']); // force delete
            });

            // Stores Route
            Route::prefix('stores')->group(function () {
                Route::get('/', [StoreController::class, 'index']);
                Route::post('/', [StoreController::class, 'store']);
                Route::get('/{store}', [StoreController::class, 'show']);
                Route::put('/{store}', [StoreController::class, 'update']);
                Route::post('trash/{store}', [StoreController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [StoreController::class, 'restore']);
                Route::delete('/{id}', [StoreController::class, 'destroy']); // force delete
            });
            // Stores Route
            Route::prefix('locations')->group(function () {
                Route::get('/', [LocationController::class, 'index']);
                Route::post('/', [LocationController::class, 'store']);
                Route::get('/{location}', [LocationController::class, 'show']);
                Route::put('/{location}', [LocationController::class, 'update']);
                Route::post('trash/{location}', [LocationController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [LocationController::class, 'restore']);
                Route::delete('/{id}', [LocationController::class, 'destroy']); // force delete
            });

            // PP/SP Setup Route (price code)
            Route::prefix('pp-sp-setups')->group(function () {
                Route::get('/', [PpSpSetupController::class, 'index']);
                Route::post('/', [PpSpSetupController::class, 'store']);
                Route::get('/{ppSpSetup}', [PpSpSetupController::class, 'show']);
                Route::put('/{ppSpSetup}', [PpSpSetupController::class, 'update']);
                Route::post('trash/{ppSpSetup}', [PpSpSetupController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [PpSpSetupController::class, 'restore']);
                Route::delete('/{id}', [PpSpSetupController::class, 'destroy']); // force delete
            });

            // Scroll Number Setup Route (month / year / prefix codes)
            Route::get('scroll-codes', [ScrollCodeController::class, 'index']);
            Route::put('scroll-codes', [ScrollCodeController::class, 'update']);

            // Purchase Price / Sale Price of products
            Route::prefix('product-prices')->group(function () {
                Route::get('/', [ProductPriceController::class, 'index']);
                Route::post('/{product}/purchase-price', [ProductPriceController::class, 'addPurchasePrice']);
                Route::post('/{product}/sell-price', [ProductPriceController::class, 'addSellPrice']);
                Route::get('/{product}/sell-price-history', [ProductPriceController::class, 'sellPriceHistory']);
            });
        });

        // Inventory Route
        Route::prefix('inventory')->group(function () {
            Route::get('stock', [InventoryController::class, 'stock']);
            Route::get('barcodes', [InventoryController::class, 'barcodes']);
        });

        // Purchase Route
        Route::prefix('purchase')->group(function () {

            // Supplier Route
            Route::prefix('suppliers')->group(function () {
                Route::get('/', [SupplierController::class, 'index']);
                Route::post('/', [SupplierController::class, 'store']);
                Route::get('/{supplier}', [SupplierController::class, 'show']);
                Route::put('/{supplier}', [SupplierController::class, 'update']);
                Route::post('trash/{supplier}', [SupplierController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [SupplierController::class, 'restore']);
                Route::delete('/{id}', [SupplierController::class, 'destroy']); // force delete
            });

            // Purchase Prices Routes
            Route::prefix('purchase-prices')->group(function () {
                Route::get('/', [PurchasePriceController::class, 'index']);
                Route::post('/', [PurchasePriceController::class, 'store']);
                Route::post('/bulk-import', [PurchasePriceController::class, 'bulkImport']);
                Route::get('/summary-by-product', [PurchasePriceController::class, 'summaryByProduct']);
                Route::get('/product-history/{productId}', [PurchasePriceController::class, 'productHistory']);
                Route::get('/monthly-summary', [PurchasePriceController::class, 'monthlySummary']);
                Route::get('/latest-prices', [PurchasePriceController::class, 'latestPrices']);

                Route::prefix('{id}')->group(function () {
                    Route::get('/', [PurchasePriceController::class, 'show']);
                    Route::put('/', [PurchasePriceController::class, 'update']);
                    Route::patch('/', [PurchasePriceController::class, 'update']);
                    Route::delete('/', [PurchasePriceController::class, 'destroy']);
                    Route::post('/restore', [PurchasePriceController::class, 'restore']);
                    Route::delete('/force', [PurchasePriceController::class, 'forceDelete']);
                });
            });

            // Purchase Return Routes (stock out of an approved PO)
            Route::prefix('purchase-returns')->group(function () {
                Route::get('/', [PurchaseReturnController::class, 'index']);
                Route::post('/', [PurchaseReturnController::class, 'store']);
                Route::get('/returnable', [PurchaseReturnController::class, 'returnable']);
                Route::get('/form/{purchase}', [PurchaseReturnController::class, 'form']);
                Route::get('/{id}', [PurchaseReturnController::class, 'show']);
                Route::delete('/{purchaseReturn}', [PurchaseReturnController::class, 'destroy']);
            });

            // Supplier Payment (we pay the supplier due)
            Route::prefix('supplier-payments')->group(function () {
                Route::get('/', [SupplierPaymentController::class, 'index']);
                Route::post('/', [SupplierPaymentController::class, 'store']);
                Route::get('/suppliers', [SupplierPaymentController::class, 'suppliers']);
                Route::get('/form/{supplier}', [SupplierPaymentController::class, 'form']);
                Route::get('/{slNo}', [SupplierPaymentController::class, 'show']);
                Route::delete('/{slNo}', [SupplierPaymentController::class, 'destroy']);
            });

            // Direct Purchase Routes (create -> approve = stock in)
            Route::prefix('purchases')->group(function () {
                Route::get('/', [PurchaseController::class, 'index']);
                Route::post('/', [PurchaseController::class, 'store']);
                Route::get('/form-options', [PurchaseController::class, 'formOptions']);
                Route::get('/search-products', [PurchaseController::class, 'searchProducts']);
                Route::get('/search-suppliers', [PurchaseController::class, 'searchSuppliers']);
                Route::get('/{id}', [PurchaseController::class, 'show']);
                Route::put('/{purchase}', [PurchaseController::class, 'update']);
                Route::delete('/{purchase}', [PurchaseController::class, 'destroy']);
                Route::post('/{purchase}/approve', [PurchaseController::class, 'approve']);
                Route::post('/{purchase}/cancel', [PurchaseController::class, 'cancel']);
                Route::post('/{purchase}/undo-cancel', [PurchaseController::class, 'undoCancel']);
            });

        });

        // Sales Route
        Route::prefix('sales')->group(function () {

            // Customer Route
            Route::prefix('customers')->group(function () {
                Route::get('/', [CustomerController::class, 'index']);
                Route::post('/', [CustomerController::class, 'store']);
                Route::get('/{customer}', [CustomerController::class, 'show']);
                Route::put('/{customer}', [CustomerController::class, 'update']);
                Route::post('trash/{supplier}', [CustomerController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [CustomerController::class, 'restore']);
                Route::delete('/{id}', [CustomerController::class, 'destroy']); // force delete
            });

            // Customers Contact Route (phone book)
            Route::prefix('customers-contacts')->group(function () {
                Route::get('/', [CustomersContactController::class, 'index']);
                Route::post('/', [CustomersContactController::class, 'store']);
                Route::get('/{id}', [CustomersContactController::class, 'show']);
                Route::put('/{id}', [CustomersContactController::class, 'update']);
                Route::post('trash/{id}', [CustomersContactController::class, 'trash']); // soft delete
                Route::post('/restore/{id}', [CustomersContactController::class, 'restore']);
                Route::delete('/{id}', [CustomersContactController::class, 'destroy']); // force delete
            });

            // Sales Routes (create -> approve = stock out)
            Route::prefix('sales')->group(function () {
                Route::get('/', [SaleController::class, 'index']);
                Route::post('/', [SaleController::class, 'store']);
                Route::get('/form-options', [SaleController::class, 'formOptions']);
                Route::get('/search-customers', [SaleController::class, 'searchCustomers']);
                Route::get('/search-barcodes', [SaleController::class, 'searchBarcodes']);
                Route::delete('/items/{saleDetail}', [SaleController::class, 'destroyItem']);
                Route::get('/{id}', [SaleController::class, 'show']);
                Route::put('/{sale}', [SaleController::class, 'update']);
                Route::delete('/{sale}', [SaleController::class, 'destroy']);
                Route::post('/{sale}/approve', [SaleController::class, 'approve']);
            });

            // Sales Return (stock back in, lowers the customer due)
            Route::prefix('sale-returns')->group(function () {
                Route::get('/', [SaleReturnController::class, 'index']);
                Route::post('/', [SaleReturnController::class, 'store']);
                Route::get('/returnable', [SaleReturnController::class, 'returnable']);
                Route::get('/form/{sale}', [SaleReturnController::class, 'form']);
                Route::get('/{id}', [SaleReturnController::class, 'show']);
                Route::delete('/{saleReturn}', [SaleReturnController::class, 'destroy']);
            });

            // Money Receipt (customer pays the due)
            Route::prefix('money-receipts')->group(function () {
                Route::get('/', [MoneyReceiptController::class, 'index']);
                Route::post('/', [MoneyReceiptController::class, 'store']);
                Route::get('/customers', [MoneyReceiptController::class, 'customers']);
                Route::get('/form/{customer}', [MoneyReceiptController::class, 'form']);
                Route::get('/{mrNo}', [MoneyReceiptController::class, 'show']);
                Route::delete('/{mrNo}', [MoneyReceiptController::class, 'destroy']);
            });

            // Sell Price
            Route::apiResource('sell-prices', SellPriceController::class);
            Route::prefix('sell-prices')->group(function () {
                Route::get('product/{productId}', [SellPriceController::class, 'productPrices']);
                Route::get('product/{productId}/current', [SellPriceController::class, 'currentPrice']);
                Route::get('product/{productId}/calculate-discount', [SellPriceController::class, 'calculateDiscount']);
                Route::put('{id}/restore', [SellPriceController::class, 'restore']);
            });
        });
    });

    Route::get('/test-cors', function () {
        return response()->json(['message' => 'CORS is working!']);
    });

    Route::fallback(function () {
        return ApiResponse::notFound('Endpoint not found');
    })->where('any', '.*');
});
