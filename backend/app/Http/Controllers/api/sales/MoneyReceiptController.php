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
        $rows = $this->service->getReceiptRows(
            $request->only('mr_no', 'customer_name', 'order_no', 'received_type', 'receipt_date'),
            $request->get('per_page')
        );
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
        return $this->run(fn() => $this->service->receiptForm($customer), 'Money receipt form');
    }

    public function store(MoneyReceiptRequest $request)
    {
        $customer = Customer::findOrFail($request->customer_id);
        return $this->run(
            fn() => ['mr_no' => $this->service->createReceipt($customer, $request->validated())],
            'Money receipt saved successfully',
            201
        );
    }

    public function show(string $mrNo)
    {
        return $this->run(fn() => $this->service->getReceipt($mrNo), 'Money receipt retrieve successfully');
    }

    public function destroy(string $mrNo)
    {
        return $this->run(fn() => $this->service->deleteReceipt($mrNo), 'Money receipt deleted successfully');
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
