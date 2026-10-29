<?php

namespace App\Http\Controllers\Api\sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\sales\sellPrice\StoreSellPriceRequest;
use App\Http\Requests\sales\sellPrice\UpdateSellPriceRequest;
use App\Services\sales\SellPriceService;
use Illuminate\Http\Request;

class SellPriceController extends Controller
{
    protected $service;

    public function __construct(SellPriceService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $filters = $request->only(['product_id', 'is_active', 'search', 'date', 'from_date', 'to_date']);

        $result = $this->service->getPaginatedPrices($perPage, $filters);
        return $result;
    }

    public function store(StoreSellPriceRequest $request)
    {
        $validated = $request->validated();
        return $this->service->createPrice($validated);
    }

    public function show($id)
    {
        return $this->service->getPriceById($id);
    }

    public function update(UpdateSellPriceRequest $request, $id)
    {
        $validated = $request->validated();
        return $this->service->updatePrice($id, $validated);
    }

    public function destroy($id)
    {
        return $this->service->deletePrice($id);
    }

    public function restore($id)
    {
        return $this->service->restorePrice($id);
    }

    public function productPrices($productId)
    {
        return $this->service->getProductPrices($productId);
    }

    public function currentPrice($productId)
    {
        return $this->service->getCurrentProductPrice($productId);
    }

    public function calculateDiscount($productId)
    {
        return $this->service->calculateDiscount($productId);
    }
}
