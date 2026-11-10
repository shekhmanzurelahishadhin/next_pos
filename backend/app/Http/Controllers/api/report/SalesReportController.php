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
        $this->middleware('permission:sales-summary-report.view')->only('salesSummary');
        $this->middleware('permission:sales-return-report.view')->only('salesReturn');
        $this->middleware('permission:collection-report.view')->only('collection');
        $this->middleware('permission:invoice-wise-collection-report.view')->only('invoiceCollection');
        $this->middleware('permission:customer-due-report.view')->only('customerDue');
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

    public function salesSummary(Request $request)
    {
        $filters = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'company_id' => 'nullable|integer',
            'customer_type_id' => 'nullable|integer',
            'customer_id' => 'nullable|integer',
            'paid' => 'nullable|in:0,1',
        ]);
        if (isset($filters['paid'])) {
            $filters['paid'] = (int) $filters['paid'];
        }

        return ApiResponse::success($this->service->salesSummary($filters), 'Sales summary report retrieve successfully');
    }

    public function salesReturn(Request $request)
    {
        $filters = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'company_id' => 'nullable|integer',
            'customer_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
            'sub_category_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'barcode' => 'nullable|string|max:255',
        ]);

        return ApiResponse::success($this->service->salesReturn($filters), 'Sales return report retrieve successfully');
    }

    public function collection(Request $request)
    {
        return ApiResponse::success($this->service->collection($this->receiptFilters($request)), 'Collection report retrieve successfully');
    }

    public function invoiceCollection(Request $request)
    {
        return ApiResponse::success($this->service->invoiceCollection($this->receiptFilters($request)), 'Invoice wise collection report retrieve successfully');
    }

    public function customerDue(Request $request)
    {
        $filters = $request->validate([
            'end_date' => 'required|date',
            'company_id' => 'nullable|integer',
            'customer_id' => 'nullable|integer',
        ]);

        return ApiResponse::success($this->service->customerDue($filters), 'Customer due report retrieve successfully');
    }

    private function receiptFilters(Request $request): array
    {
        return $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'company_id' => 'nullable|integer',
            'received_type' => 'nullable|in:1,2,3,4,5',
            'bank_name' => 'nullable|string|max:255',
            'customer_id' => 'nullable|integer',
        ]);
    }

    public function searchCustomers(Request $request)
    {
        return ApiResponse::success($this->service->searchCustomers((string) $request->get('term', '')), 'Customers retrieve successfully');
    }
}
