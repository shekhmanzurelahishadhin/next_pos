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
        $rows = $this->service->getRows(
            $request->only('max_sl_no', 'store_id', 'product_name', 'code'),
            $request->get('per_page')
        );
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Short list orders retrieve successfully');
    }

    // Part number autocomplete with stock of the store and the last purchase price
    public function searchProducts(Request $request, PurchaseService $purchaseService)
    {
        $term = trim((string) $request->get('term'));
        if (mb_strlen($term) < 2) {
            return ApiResponse::success([], 'Type at least 2 characters');
        }
        return ApiResponse::success($purchaseService->searchProducts($term, $request->integer('store_id') ?: null), 'Products');
    }

    public function store(ShortListOrderRequest $request)
    {
        return $this->run(
            fn() => ['max_sl_no' => $this->service->createList($request->validated()['items'])],
            'Short list order saved successfully',
            201
        );
    }

    public function show(int $maxSlNo)
    {
        return $this->run(fn() => $this->service->getList($maxSlNo), 'Short list order retrieve successfully');
    }

    public function destroy(int $maxSlNo)
    {
        return $this->run(fn() => $this->service->deleteList($maxSlNo), 'Short list order deleted successfully');
    }

    // business rule errors go back as 422 with the message
    private function run(callable $action, string $message, int $code = 200)
    {
        try {
            return ApiResponse::success($action(), $message, $code);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
