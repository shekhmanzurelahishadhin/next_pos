<?php

namespace App\Http\Controllers\api\softConfig;

use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\subCategory\CreateSubCategoryRequest;
use App\Http\Requests\softConfig\subCategory\UpdateSubCategoryRequest;
use App\Http\Resources\softConfig\category\CategoryResource;
use App\Http\Resources\softConfig\subCategory\SubCategoryResource;
use App\Models\softConfig\SubCategory;
use App\Services\softConfig\SubCategoryService;
use Illuminate\Http\Request;
use App\Helpers\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class SubCategoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:sub-category.create|sub-category.view|sub-category.edit|sub-category.delete')->only('index');
        $this->middleware('permission:sub-category.create')->only('store');
        $this->middleware('permission:sub-category.edit')->only('update');
        $this->middleware('permission:sub-category.delete')->only('destroy');
    }
    public function index(Request $request, SubCategoryService $subCategoryService)
    {
        try {
            $perPage    = $request->get('per_page');
            $filters    = $request->only('status','name','category_name','created_at','created_by','updated_at');
            $categoryId = $request->query('category_id');

            $subCategories = $subCategoryService->getSubCategories($filters, $perPage, $categoryId);

            if ($subCategories instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'data'         => SubCategoryResource::collection($subCategories->items()),
                    'total'        => $subCategories->total(),
                    'current_page' => $subCategories->currentPage(),
                    'per_page'     => $subCategories->perPage(),
                ];
            }else{
                // Collection response (no pagination)
                $data = [
                    'data'         => SubCategoryResource::collection($subCategories),
                    'total'        => $subCategories->count(),
                    'current_page' => 1,
                    'per_page'     => $subCategories->count(),
                ];
            }

            return ApiResponse::success($data, 'Sub-categories retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve sub-categories');
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateSubCategoryRequest $request, SubCategoryService $subCategoryService)
    {
        try {
            $validatedData = $request->validated();
            $subCategory   = $subCategoryService->createSubCategory($validatedData);

            return ApiResponse::success(
                new SubCategoryResource($subCategory),
                'SubCategory created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create SubCategory');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $subCategory  = SubCategory::withTrashed()->findOrFail($id);

            return ApiResponse::success(
                new SubCategoryResource($subCategory),
                'SubCategory retrieved successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieved SubCategory');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSubCategoryRequest $request, SubCategoryService $subCategoryService, SubCategory $subCategory)
    {
        try {
            $subCategory  = $subCategoryService->updateSubCategory($subCategory , $request->validated());

            return ApiResponse::success(
                new SubCategoryResource($subCategory),
                'SubCategory updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update SubCategory');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(SubCategory $subCategory , SubCategoryService $subCategoryService)
    {
        try {
            $subCategoryService->softDeleteSubCategory($subCategory);

            return ApiResponse::success(
                null,
                'SubCategory moved to trash successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move SubCategory to trash');
        }
    }

    // Restore soft-deleted category
    public function restore($id, SubCategoryService $subCategoryService)
    {
        try {
            $subCategory  = SubCategory::withTrashed()->findOrFail($id);

            $subCategory  = $subCategoryService->restoreSubCategory($subCategory);

            return ApiResponse::success(
                new SubCategoryResource($subCategory),
                'SubCategory restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('SubCategory not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore SubCategory');
        }
    }

    // Force delete permanently
    public function destroy($id, SubCategoryService $subCategoryService)
    {
        $subCategory  = SubCategory::withTrashed()->findOrFail($id);
        $deleted = $subCategoryService->forceDeleteSubCategory($subCategory);

        if ($deleted) {
            return response()->json([
                'message' => 'SubCategory permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'SubCategory is not in trash',
        ], 400);
    }
}
