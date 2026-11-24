<?php

namespace App\Http\Controllers\api\inventory;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\inventory\ManualStockRequest;
use App\Models\inventory\Inventory;
use App\Services\inventory\ManualStockService;
use App\Services\inventory\StockTransferService;
use App\Services\purchase\PurchaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Manual stock in / out on the Inventory Stock page (parts_bazar inventory/create)
class ManualStockController extends Controller
{
    public function __construct(private ManualStockService $service)
    {
        $this->middleware('permission:inventory-stock.create')->only('store', 'searchProducts', 'searchBarcodes');
        $this->middleware('permission:inventory-stock.delete')->only('destroy');
    }

    // part number autocomplete for a stock in: latest purchase price, active sell price, stock at the location
    public function searchProducts(Request $request, PurchaseService $purchases)
    {
        $term = trim((string) $request->get('term', ''));
        if ($term === '') {
            return ApiResponse::success([], 'Products');
        }
        $storeId = $request->integer('store_id') ?: null;
        $locationId = $request->integer('location_id') ?: null;
        return ApiResponse::success($purchases->searchProducts($term, $storeId, $locationId), 'Products');
    }

    // barcode autocomplete for a stock out: barcodes with stock that no pending sale or transfer holds
    public function searchBarcodes(Request $request, StockTransferService $transfers)
    {
        $term = trim((string) $request->get('term', ''));
        if ($term === '') {
            return ApiResponse::success([], 'Barcodes');
        }
        $companyId = null;
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            $companyId = $user->company_id;
        }
        return ApiResponse::success($transfers->searchBarcodes($term, $companyId), 'Barcodes');
    }

    public function store(ManualStockRequest $request)
    {
        try {
            $row = $this->service->save($request->validated());
            return ApiResponse::success($row, 'Data saved successfully.', 201);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('An error occurred while saving the data. Please try again.');
        }
    }

    public function destroy(Inventory $inventory)
    {
        try {
            $this->service->delete($inventory);
            return ApiResponse::success(null, 'Deleted successfully');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
    }
}
