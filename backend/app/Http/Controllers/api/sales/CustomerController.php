<?php

namespace App\Http\Controllers\api\sales;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\sales\customer\CreateCustomerRequest;
use App\Http\Requests\sales\customer\UpdateCustomerRequest;
use App\Http\Resources\sales\CustomerResource;
use App\Models\sales\Customer;
use App\Services\sales\CustomerService;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;

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
            $perPage   = $request->get('per_page');
            $filters   = $request->only('search','status','name','code','company_name','address','opening_balance','opening_balance_type','phone','email','created_at','created_by');

            $customers = $customerService->getCustomers($filters, $perPage);

            if ($customers instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'data'         => CustomerResource::collection($customers->items()),
                    'total'        => $customers->total(),
                    'current_page' => $customers->currentPage(),
                    'per_page'     => $customers->perPage(),
                ];
            }else{
                // Collection response (no pagination)
                $data = [
                    'data'         => CustomerResource::collection($customers),
                    'total'        => $customers->count(),
                    'current_page' => 1,
                    'per_page'     => $customers->count(),
                ];
            }

            return ApiResponse::success($data, 'Customer retrieved successfully');

        }catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve customers');
        }
    }

    public function store(CreateCustomerRequest $request, CustomerService $customerService)
    {
        try {
            $validatedData = $request->validated();
            $customer      = $customerService->createCustomer($validatedData);

            return ApiResponse::success(
                new CustomerResource($customer),
                'Customer created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create customer');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $customer  = Customer::withTrashed()->findOrFail($id);

            return ApiResponse::success(
                new CustomerResource($customer),
                'Customer retrieve successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve customer');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCustomerRequest $request, CustomerService $customerService, Customer $customer)
    {
        try {
            $customer  = $customerService->updateCustomer($customer , $request->validated());

            return ApiResponse::success(
                new CustomerResource($customer),
                'Customer updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update customer');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(Customer $customer , CustomerService $customerService)
    {
        try {
            $customerService->softDeleteCustomer($customer);

            return ApiResponse::success(
                null,
                'Customer moved to trash successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move customer to trash');
        }
    }

    // Restore soft-deleted store
    public function restore($id, CustomerService $customerService)
    {
        try {

            $customer  = Customer::withTrashed()->findOrFail($id);

            $customer  = $customerService->restoreCustomer($customer);

            return ApiResponse::success(
                new CustomerResource($customer),
                'Customer restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Customer not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore customer');
        }
    }

    // Force delete permanently
    public function destroy($id, CustomerService $customerService)
    {
        $customer  = Customer::withTrashed()->findOrFail($id);
        $deleted = $customerService->forceDeleteCustomer($customer);

        if ($deleted) {
            return response()->json([
                'message' => 'Customer permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Customer is not in trash',
        ], 400);
    }
}
