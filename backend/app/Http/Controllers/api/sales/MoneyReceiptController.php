<?php

namespace App\Http\Controllers\api\sales;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\sales\MoneyReceiptRequest;
use App\Models\sales\Customer;
use App\Services\sales\MoneyReceiptService;
use Illuminate\Http\Request;

class MoneyReceiptController extends Controller
{
    public function __construct(private MoneyReceiptService $service)
    {
        $this->middleware('permission:money-receipt.create|money-receipt.view|money-receipt.delete')->only('index', 'show');
        $this->middleware('permission:money-receipt.create')->only('customers', 'form', 'store');
        $this->middleware('permission:money-receipt.delete')->only('destroy');
    }

    // Manage Money Receipt: one row per MR no
    public function index(Request $request)
    {
        $filters = $request->only('mr_no', 'customer_name', 'order_no', 'received_type', 'receipt_date');
        $rows = $this->service->getReceiptRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Money receipts retrieve successfully');
    }

    // Create Money Receipt: customers with their due
    public function customers(Request $request)
    {
        $rows = $this->service->getCustomerRows($request->only('name', 'phone'), $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Customers retrieve successfully');
    }

    public function form(Customer $customer)
    {
        try {
            return ApiResponse::success($this->service->receiptForm($customer), 'Money receipt form');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function store(MoneyReceiptRequest $request)
    {
        $customer = Customer::findOrFail($request->customer_id);

        try {
            $mrNo = $this->service->createReceipt($customer, $request->validated());
            return ApiResponse::success(['mr_no' => $mrNo], 'Money receipt saved successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function show(string $mrNo)
    {
        try {
            return ApiResponse::success($this->service->getReceipt($mrNo), 'Money receipt retrieve successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(string $mrNo)
    {
        try {
            $this->service->deleteReceipt($mrNo);
            return ApiResponse::success(null, 'Money receipt deleted successfully');
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
