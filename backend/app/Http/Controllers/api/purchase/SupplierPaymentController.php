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
        $rows = $this->service->getPaymentRows(
            $request->only('sl_no', 'supplier_name', 'po_no', 'payment_type', 'payment_date'),
            $request->get('per_page')
        );
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
        return $this->run(fn() => $this->service->paymentForm($supplier), 'Supplier payment form');
    }

    public function store(SupplierPaymentRequest $request)
    {
        $supplier = Supplier::findOrFail($request->supplier_id);
        return $this->run(
            fn() => ['sl_no' => $this->service->createPayment($supplier, $request->validated())],
            'Supplier payment saved successfully',
            201
        );
    }

    public function show(string $slNo)
    {
        return $this->run(fn() => $this->service->getPayment($slNo), 'Supplier payment retrieve successfully');
    }

    public function destroy(string $slNo)
    {
        return $this->run(fn() => $this->service->deletePayment($slNo), 'Supplier payment deleted successfully');
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
