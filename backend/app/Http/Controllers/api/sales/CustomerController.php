<?php

namespace App\Http\Controllers\api\sales;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\sales\customer\CreateCustomerRequest;
use App\Http\Requests\sales\customer\UpdateCustomerRequest;
use App\Http\Resources\sales\CustomerResource;
use App\Models\sales\Customer;
use App\Services\sales\CustomerService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class CustomerController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:customer.create|customer.view|customer.edit|customer.delete')->only('index');
        $this->middleware('permission:customer.create')->only('store');
        $this->middleware('permission:customer.edit')->only('update');
        $this->middleware('permission:customer.delete')->only('destroy');
    }

    public function index(Request $request, CustomerService $customerService)
    {
        try {
            $filters = $request->only('status', 'name', 'code', 'address', 'opening_balance', 'opening_balance_type', 'phone', 'email', 'created_at', 'created_by');
            $customers = $customerService->getCustomers($filters, $request->get('per_page'));

            if ($customers instanceof LengthAwarePaginator) {
                // one page of customers
                $data = [
                    'data'         => CustomerResource::collection($customers->items()),
                    'total'        => $customers->total(),
                    'current_page' => $customers->currentPage(),
                    'per_page'     => $customers->perPage(),
                ];
            } else {
                // every customer (no per_page given)
                $data = [
                    'data'         => CustomerResource::collection($customers),
                    'total'        => $customers->count(),
                    'current_page' => 1,
                    'per_page'     => $customers->count(),
                ];
            }

            return ApiResponse::success($data, 'Customer retrieved successfully');
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Failed to retrieve customers');
        }
    }

    public function store(CreateCustomerRequest $request, CustomerService $customerService)
    {
        try {
            $customer = $customerService->createCustomer($request->validated());
            return ApiResponse::success(new CustomerResource($customer), 'Customer created successfully', 201);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Failed to create customer');
        }
    }

    public function show(string $id)
    {
        try {
            $customer = Customer::withTrashed()->findOrFail($id);
            return ApiResponse::success(new CustomerResource($customer), 'Customer retrieve successfully', 201);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve customer');
        }
    }

    public function update(UpdateCustomerRequest $request, CustomerService $customerService, Customer $customer)
    {
        try {
            $customer = $customerService->updateCustomer($customer, $request->validated());
            return ApiResponse::success(new CustomerResource($customer), 'Customer updated successfully');
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Failed to update customer');
        }
    }

    // move to trash (soft delete)
    public function trash(Customer $customer, CustomerService $customerService)
    {
        try {
            $customerService->softDeleteCustomer($customer);
            return ApiResponse::success(null, 'Customer moved to trash successfully');
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Failed to move customer to trash');
        }
    }

    // take back from trash
    public function restore($id, CustomerService $customerService)
    {
        try {
            $customer = Customer::withTrashed()->findOrFail($id);
            $customer = $customerService->restoreCustomer($customer);
            return ApiResponse::success(new CustomerResource($customer), 'Customer restored successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Customer not found');
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Failed to restore customer');
        }
    }

    // delete for ever (only a customer in the trash)
    public function destroy($id, CustomerService $customerService)
    {
        $customer = Customer::withTrashed()->findOrFail($id);
        $deleted = $customerService->forceDeleteCustomer($customer);

        if (!$deleted) {
            return response()->json(['message' => 'Customer is not in trash'], 400);
        }

        return response()->json(['message' => 'Customer permanently deleted']);
    }
}
