<?php

namespace App\Http\Controllers\api\softConfig;

use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\brand\CreateBrandRequest;
use App\Http\Requests\softConfig\brand\UpdateBrandRequest;
use App\Http\Resources\softConfig\brand\BrandResource;
use App\Models\softConfig\Brand;
use App\Services\softConfig\BrandService;
use Illuminate\Http\Request;
use App\Helpers\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class BrandController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:brand.create|brand.view|brand.edit|brand.delete')->only('index');
        $this->middleware('permission:brand.create')->only('store');
        $this->middleware('permission:brand.edit')->only('update');
        $this->middleware('permission:brand.delete')->only('destroy');
    }

    public function index(Request $request, BrandService $brandService)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('status','name','created_at','updated_at','created_by');
            $columns = $request->get('columns', BrandService::defaultColumns);

            $brands = $brandService->getBrands($filters, $perPage, $columns);

            if ($brands instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                $items = collect($brands->items())->map(fn($brand) => new BrandResource((object) $brand, $columns));
                // Paginated response
                $data = [
                    'data'         => $items,
                    'total'        => $brands->total(),
                    'current_page' => $brands->currentPage(),
                    'per_page'     => $brands->perPage(),
                ];
            }else{
                $items = collect($brands)->map(fn($brand) => new BrandResource((object) $brand, $columns));
                // Collection response (no pagination)
                $data = [
                    'data'         => $items,
                    'total'        => $brands->count(),
                    'current_page' => 1,
                    'per_page'     => $brands->count(),
                ];
            }
            return ApiResponse::success($data, 'Brand retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Brand');
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateBrandRequest $request, BrandService $brandService)
    {
        try {
            $validatedData = $request->validated();

            $brand = $brandService->createBrand($validatedData);

            return ApiResponse::success(
                new BrandResource($brand),
                'Brand created successfully',
                201
            );
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create Brand');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $brand = Brand::withTrashed()->findOrFail($id);

            return ApiResponse::success(
                new BrandResource($brand),
                'Brand retrieved successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieved Brand');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateBrandRequest $request, BrandService $brandService, Brand $brand)
    {
        try {
            $brand = $brandService->updateBrand($brand, $request->validated());

            return ApiResponse::success(
                new BrandResource($brand),
                'Brand updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update Brand');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(Brand $brand, BrandService $brandService)
    {
        try {
            $brandService->softDeleteBrand($brand);

            return ApiResponse::success(
                null,
                'Brand moved to trash successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move Brand to trash');
        }
    }

    // Restore soft-deleted brand
    public function restore($id, BrandService $brandService)
    {
        try {
            $brand = Brand::withTrashed()->findOrFail($id);

            $brand = $brandService->restoreBrand($brand);

            return ApiResponse::success(
                new BrandResource($brand),
                'Brand restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Brand not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore Brand');
        }
    }

    // Force delete permanently
    public function destroy($id, BrandService $brandService)
    {
        $brand = Brand::withTrashed()->findOrFail($id);
        $deleted = $brandService->forceDeleteBrand($brand);

        if ($deleted) {
            return response()->json([
                'message' => 'Brand permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Brand is not in trash',
        ], 400);
    }
}
