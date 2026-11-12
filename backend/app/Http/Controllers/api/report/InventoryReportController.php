<?php

namespace App\Http\Controllers\api\report;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\report\InventoryReportService;
use Illuminate\Http\Request;

class InventoryReportController extends Controller
{
    public function __construct(private InventoryReportService $service)
    {
        $this->middleware('permission:stock-qty-report.view')->only('stockQty');
        $this->middleware('permission:stock-amount-report.view')->only('stockAmount');
        $this->middleware('permission:alert-qty-report.view')->only('alertQty');
        $this->middleware('permission:out-of-stock-report.view')->only('outOfStock');
    }

    public function stockQty(Request $request)
    {
        return ApiResponse::success($this->service->stockQty($this->stockFilters($request)), 'Stock qty report retrieve successfully');
    }

    // same rows as the Stock QTY Report; the page shows price x qty beside each qty
    public function stockAmount(Request $request)
    {
        return ApiResponse::success($this->service->stockQty($this->stockFilters($request)), 'Stock amount report retrieve successfully');
    }

    private function stockFilters(Request $request): array
    {
        return $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'company_id' => 'nullable|integer',
            'store_id' => 'nullable|integer',
            'location_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
            'sub_category_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'barcode' => 'nullable|string|max:255',
            'show' => 'nullable|in:current,all',
        ]);
    }

    public function alertQty(Request $request)
    {
        $filters = $request->validate($this->productFilterRules());
        return ApiResponse::success([
            'rows' => $this->service->alertQty($filters),
            'company' => $this->service->company(),
        ], 'Alert qty report retrieve successfully');
    }

    public function outOfStock(Request $request)
    {
        $rules = $this->productFilterRules();
        $rules['company_id'] = 'nullable|integer';
        $filters = $request->validate($rules);
        return ApiResponse::success([
            'rows' => $this->service->outOfStock($filters),
            'company' => $this->service->company($filters['company_id'] ?? null),
        ], 'Out of stock report retrieve successfully');
    }

    private function productFilterRules(): array
    {
        return [
            'sub_category_id' => 'nullable|integer',
            'brand_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
        ];
    }

    public function searchProducts(Request $request)
    {
        return ApiResponse::success($this->service->searchProducts((string) $request->get('term', '')), 'Products retrieve successfully');
    }
}
