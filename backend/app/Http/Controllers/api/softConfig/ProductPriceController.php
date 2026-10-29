<?php

namespace App\Http\Controllers\api\softConfig;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\productPrice\AddPurchasePriceRequest;
use App\Http\Requests\softConfig\productPrice\AddSellPriceRequest;
use App\Models\softConfig\Product;
use App\Services\softConfig\ProductPriceService;
use Illuminate\Http\Request;

// Purchase Price / Sale Price pages
class ProductPriceController extends Controller
{
    public function __construct(private ProductPriceService $service)
    {
        $this->middleware('permission:purchase-price.view|purchase-price.create|sell-price.view|sell-price.create')->only('index');
        $this->middleware('permission:purchase-price.create')->only('addPurchasePrice');
        $this->middleware('permission:sell-price.create')->only('addSellPrice');
        $this->middleware('permission:sell-price.view|sell-price.create')->only('sellPriceHistory');
    }

    public function index(Request $request)
    {
        try {
            $rows = $this->service->getProductRows(
                $request->only('category_id', 'sub_category_id', 'name', 'part_number'),
                $request->get('per_page')
            );

            return ApiResponse::success([
                'data'         => $rows->items(),
                'total'        => $rows->total(),
                'current_page' => $rows->currentPage(),
                'per_page'     => $rows->perPage(),
            ], 'Product prices retrieve successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve product prices');
        }
    }

    public function addPurchasePrice(AddPurchasePriceRequest $request, Product $product)
    {
        try {
            $price = $this->service->addPurchasePrice($product, $request->validated());
            return ApiResponse::success($price, 'Purchase Price Added', 201);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to add purchase price');
        }
    }

    public function addSellPrice(AddSellPriceRequest $request, Product $product)
    {
        try {
            $price = $this->service->addSellPrice($product, $request->validated());
            return ApiResponse::success($price, 'Sell Price Added', 201);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to add sell price');
        }
    }

    public function sellPriceHistory(Product $product)
    {
        return ApiResponse::success($this->service->sellPriceHistory($product), 'Sell price history');
    }
}
