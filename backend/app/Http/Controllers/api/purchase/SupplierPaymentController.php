<?php

namespace App\Http\Controllers\api\purchase;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\purchase\SupplierPaymentRequest;
use App\Models\purchase\Supplier;
use App\Services\purchase\SupplierPaymentService;
use Illuminate\Http\Request;

class SupplierPaymentController extends Controller
{
    public function __construct(private SupplierPaymentService $service)
    {
        $this->middleware('permission:supplier-payment.create|supplier-payment.view|supplier-payment.delete')->only('index', 'show');
        $this->middleware('permission:supplier-payment.create')->only('suppliers', 'form', 'store');
        $this->middleware('permission:supplier-payment.delete')->only('destroy');
    }

    // Manage Supplier Payment: one row per PR no
    public function index(Request $request)
    {
        $filters = $request->only('sl_no', 'supplier_name', 'po_no', 'payment_type', 'payment_date');
        $rows = $this->service->getPaymentRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Supplier payments retrieve successfully');
    }

    // Create Supplier Payment: suppliers with their due
    public function suppliers(Request $request)
    {
        $rows = $this->service->getSupplierRows($request->only('name', 'phone'), $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Suppliers retrieve successfully');
    }

    public function form(Supplier $supplier)
    {
        try {
            return ApiResponse::success($this->service->paymentForm($supplier), 'Supplier payment form');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function store(SupplierPaymentRequest $request)
    {
        $supplier = Supplier::findOrFail($request->supplier_id);

        try {
            $slNo = $this->service->createPayment($supplier, $request->validated());
            return ApiResponse::success(['sl_no' => $slNo], 'Supplier payment saved successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function show(string $slNo)
    {
        try {
            return ApiResponse::success($this->service->getPayment($slNo), 'Supplier payment retrieve successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(string $slNo)
    {
        try {
            $this->service->deletePayment($slNo);
            return ApiResponse::success(null, 'Supplier payment deleted successfully');
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
