<?php

namespace App\Http\Controllers\api\purchase;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\purchase\supplier\CreateSupplierRequest;
use App\Http\Requests\purchase\supplier\UpdateSupplierRequest;
use App\Http\Resources\purchase\SupplierResource;
use App\Models\purchase\Supplier;
use App\Services\purchase\SupplierService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

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
            $filters = $request->only('status', 'name', 'code', 'address', 'opening_balance', 'opening_balance_type', 'phone', 'email', 'created_at', 'created_by');
            $suppliers = $supplierService->getSuppliers($filters, $request->get('per_page'));

            if ($suppliers instanceof LengthAwarePaginator) {
                // one page of suppliers
                $data = [
                    'data'         => SupplierResource::collection($suppliers->items()),
                    'total'        => $suppliers->total(),
                    'current_page' => $suppliers->currentPage(),
                    'per_page'     => $suppliers->perPage(),
                ];
            } else {
                // every supplier (no per_page given)
                $data = [
                    'data'         => SupplierResource::collection($suppliers),
                    'total'        => $suppliers->count(),
                    'current_page' => 1,
                    'per_page'     => $suppliers->count(),
                ];
            }

            return ApiResponse::success($data, 'Supplier retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve suppliers');
        }
    }

    public function store(CreateSupplierRequest $request, SupplierService $supplierService)
    {
        try {
            $supplier = $supplierService->createSupplier($request->validated());
            return ApiResponse::success(new SupplierResource($supplier), 'Supplier created successfully', 201);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create supplier');
        }
    }

    public function show(string $id)
    {
        try {
            $supplier = Supplier::withTrashed()->findOrFail($id);
            return ApiResponse::success(new SupplierResource($supplier), 'Supplier retrieve successfully', 201);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Supplier');
        }
    }

    public function update(UpdateSupplierRequest $request, SupplierService $supplierService, Supplier $supplier)
    {
        try {
            $supplier = $supplierService->updateSupplier($supplier, $request->validated());
            return ApiResponse::success(new SupplierResource($supplier), 'Supplier updated successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update Supplier');
        }
    }

    // move to trash (soft delete)
    public function trash(Supplier $supplier, SupplierService $supplierService)
    {
        try {
            $supplierService->softDeleteSupplier($supplier);
            return ApiResponse::success(null, 'Supplier moved to trash successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move supplier to trash');
        }
    }

    // take back from trash
    public function restore($id, SupplierService $supplierService)
    {
        try {
            $supplier = Supplier::withTrashed()->findOrFail($id);
            $supplier = $supplierService->restoreSupplier($supplier);
            return ApiResponse::success(new SupplierResource($supplier), 'Supplier restored successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Supplier not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore supplier');
        }
    }

    // delete for ever (only a supplier in the trash)
    public function destroy($id, SupplierService $supplierService)
    {
        $supplier = Supplier::withTrashed()->findOrFail($id);
        $deleted = $supplierService->forceDeleteSupplier($supplier);

        if (!$deleted) {
            return response()->json(['message' => 'Supplier is not in trash'], 400);
        }

        return response()->json(['message' => 'Supplier permanently deleted']);
    }
}
