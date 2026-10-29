<?php

namespace App\Http\Controllers\api\purchase;

use App\Http\Controllers\Controller;
use App\Http\Requests\purchase\supplier\CreateSupplierRequest;
use App\Http\Requests\purchase\supplier\UpdateSupplierRequest;
use App\Http\Resources\purchase\SupplierResource;
use App\Models\purchase\Supplier;
use App\Services\purchase\SupplierService;
use Illuminate\Http\Request;
use App\Helpers\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
class SupplierController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:supplier.create|supplier.view|supplier.edit|supplier.delete')->only('index');
        $this->middleware('permission:supplier.create')->only('store');
        $this->middleware('permission:supplier.edit')->only('update');
        $this->middleware('permission:supplier.delete')->only('destroy');
    }

    public function index(Request $request, SupplierService $supplierService)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('status','name','code','address','opening_balance','opening_balance_type','phone','email','created_at','created_by');

            $suppliers = $supplierService->getSuppliers($filters, $perPage);

            if ($suppliers instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'data'         => SupplierResource::collection($suppliers->items()),
                    'total'        => $suppliers->total(),
                    'current_page' => $suppliers->currentPage(),
                    'per_page'     => $suppliers->perPage(),
                ];
            }else{
                // Collection response (no pagination)
                $data = [
                    'data'         => SupplierResource::collection($suppliers),
                    'total'        => $suppliers->count(),
                    'current_page' => 1,
                    'per_page'     => $suppliers->count(),
                ];
            }
                return ApiResponse::success($data, 'Supplier retrieved successfully');

        }catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve suppliers');
        }
    }

    public function store(CreateSupplierRequest $request, SupplierService $supplierService)
    {
        try {
            $validatedData = $request->validated();
            $supplier      = $supplierService->createSupplier($validatedData);

            return ApiResponse::success(
                new SupplierResource($supplier),
                'Supplier created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create supplier');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $supplier  = Supplier::withTrashed()->findOrFail($id);

            return ApiResponse::success(
                new SupplierResource($supplier),
                'Supplier retrieve successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Supplier');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSupplierRequest $request, SupplierService $supplierService, Supplier $supplier)
    {
        try {
            $supplier  = $supplierService->updateSupplier($supplier , $request->validated());

            return ApiResponse::success(
                new SupplierResource($supplier),
                'Supplier updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update Supplier');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(Supplier $supplier , SupplierService $supplierService)
    {
        try {
            $supplierService->softDeleteSupplier($supplier);

            return ApiResponse::success(
                null,
                'Supplier moved to trash successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move supplier to trash');
        }
    }

    // Restore soft-deleted store
    public function restore($id, SupplierService $supplierService)
    {
        try {
            $supplier  = Supplier::withTrashed()->findOrFail($id);

            $supplier  = $supplierService->restoreSupplier($supplier);

            return ApiResponse::success(
                new SupplierResource($supplier),
                'Supplier restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Supplier not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore supplier');
        }
    }

    // Force delete permanently
    public function destroy($id, SupplierService $supplierService)
    {
        $supplier  = Supplier::withTrashed()->findOrFail($id);
        $deleted = $supplierService->forceDeleteSupplier($supplier);

        if ($deleted) {
            return response()->json([
                'message' => 'Supplier permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Supplier is not in trash',
        ], 400);
    }
}
