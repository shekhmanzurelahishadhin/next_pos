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
            'brand_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'barcode' => 'nullable|string|max:255',
            'show' => 'nullable|in:current,all',
        ]);
    }

    public function searchProducts(Request $request)
    {
        return ApiResponse::success($this->service->searchProducts((string) $request->get('term', '')), 'Products retrieve successfully');
    }
}
