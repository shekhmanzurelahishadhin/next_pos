<?php

namespace App\Http\Controllers\api\report;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\report\PurchaseReportService;
use Illuminate\Http\Request;

class PurchaseReportController extends Controller
{
    public function __construct(private PurchaseReportService $service)
    {
        $this->middleware('permission:purchase-report.view')->only('purchase');
    }

    public function purchase(Request $request)
    {
        $filters = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'supplier_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
            'sub_category_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'barcode' => 'nullable|string|max:255',
        ]);

        return ApiResponse::success($this->service->purchase($filters), 'Purchase report retrieve successfully');
    }

    public function searchSuppliers(Request $request)
    {
        return ApiResponse::success($this->service->searchSuppliers((string) $request->get('term', '')), 'Suppliers retrieve successfully');
    }
}
