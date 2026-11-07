<?php

namespace App\Http\Controllers\api\report;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\report\SalesReportService;
use Illuminate\Http\Request;

class SalesReportController extends Controller
{
    public function __construct(private SalesReportService $service)
    {
        $this->middleware('permission:sales-report.view')->only('sales');
    }

    public function sales(Request $request)
    {
        $filters = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'customer_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
            'sub_category_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'barcode' => 'nullable|string|max:255',
        ]);

        return ApiResponse::success($this->service->sales($filters), 'Sales report retrieve successfully');
    }

    public function searchCustomers(Request $request)
    {
        return ApiResponse::success($this->service->searchCustomers((string) $request->get('term', '')), 'Customers retrieve successfully');
    }
}
