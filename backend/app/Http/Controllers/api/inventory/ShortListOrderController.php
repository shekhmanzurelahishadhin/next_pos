<?php

namespace App\Http\Controllers\api\inventory;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\inventory\ShortListOrderRequest;
use App\Services\inventory\ShortListOrderService;
use App\Services\purchase\PurchaseService;
use Illuminate\Http\Request;

class ShortListOrderController extends Controller
{
    public function __construct(private ShortListOrderService $service)
    {
        $this->middleware('permission:short-list-order.create|short-list-order.view|short-list-order.delete')->only('index', 'show');
        $this->middleware('permission:short-list-order.create')->only('searchProducts', 'store');
        $this->middleware('permission:short-list-order.delete')->only('destroy');
    }

    // Manage Short List Order: one row per product line
    public function index(Request $request)
    {
        $filters = $request->only('max_sl_no', 'store_id', 'product_name', 'code');
        $rows = $this->service->getRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Short list orders retrieve successfully');
    }

    // Part number autocomplete with the stock of the store and the last purchase price
    public function searchProducts(Request $request, PurchaseService $purchaseService)
    {
        $term = trim((string) $request->get('term'));
        if (mb_strlen($term) < 2) {
            return ApiResponse::success([], 'Type at least 2 characters');
        }

        // 0 or empty = all stores
        $storeId = $request->integer('store_id') ?: null;

        return ApiResponse::success($purchaseService->searchProducts($term, $storeId), 'Products');
    }

    public function store(ShortListOrderRequest $request)
    {
        try {
            $maxSlNo = $this->service->createList($request->validated()['items']);
            return ApiResponse::success(['max_sl_no' => $maxSlNo], 'Short list order saved successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function show(int $maxSlNo)
    {
        try {
            return ApiResponse::success($this->service->getList($maxSlNo), 'Short list order retrieve successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(int $maxSlNo)
    {
        try {
            $this->service->deleteList($maxSlNo);
            return ApiResponse::success(null, 'Short list order deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // A business rule error goes back as 422 with its message,
    // any other error is logged and a general message is sent
    private function errorResponse(\Exception $e)
    {
        if ($e instanceof \RuntimeException) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        report($e);
        return ApiResponse::serverError('Something went wrong, please try again');
    }
}
