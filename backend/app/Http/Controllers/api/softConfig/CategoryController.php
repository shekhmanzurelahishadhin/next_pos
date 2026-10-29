<?php

namespace App\Http\Controllers\api\softConfig;

use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\category\CreateCategoryRequest;
use App\Http\Requests\softConfig\category\UpdateCategoryRequest;
use App\Http\Resources\softConfig\category\CategoryResource;
use App\Models\softConfig\Category;
use App\Services\softConfig\CategoryService;
use Illuminate\Http\Request;
use App\Helpers\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;


class CategoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:category.create|category.view|category.edit|category.delete')->only('index');
        $this->middleware('permission:category.create')->only('store');
        $this->middleware('permission:category.edit')->only('update');
        $this->middleware('permission:category.delete')->only('destroy');
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, CategoryService $categoryService)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('search','status','name', 'slug', 'created_by','created_at');
            $columns = $request->get('columns', CategoryService::defaultColumns);
            $categories = $categoryService->getCategories($filters, $perPage, $columns);

            if ($categories instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                $items = collect($categories->items())->map(fn($category) => new CategoryResource((object) $category, $columns));
                // Paginated response
                $data = [
                    'data'         => $items,
                    'total'        => $categories->total(),
                    'current_page' => $categories->currentPage(),
                    'per_page'     => $categories->perPage(),
                ];
            }else {
                // Collection response (no pagination)
                $items = collect($categories)->map(fn($category) => new CategoryResource((object) $category, $columns));
                $data = [
                    'data'         => $items,
                    'total'        => $categories->count(),
                    'current_page' => 1,
                    'per_page'     => $categories->count(),
                ];
            }

            return ApiResponse::success($data, 'Categories retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve categories');
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateCategoryRequest $request, CategoryService $categoryService)
    {
        try {
            $validatedData = $request->validated();

            $category = $categoryService->createCategory($validatedData);

            return ApiResponse::success(
                new CategoryResource($category),
                'Category created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create category');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return ApiResponse::notFound('Not implemented');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCategoryRequest $request, CategoryService $categoryService, Category $category)
    {
        try {
            $category = $categoryService->updateCategory($category, $request->validated());

            return ApiResponse::success(
                new CategoryResource($category),
                'Category updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update category');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(Category $category, CategoryService $categoryService)
    {
        try {
            $categoryService->softDeleteCategory($category);

            return ApiResponse::success(
                null,
                'Category moved to trash successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move category to trash');
        }
    }

    // Restore soft-deleted category
    public function restore($id, CategoryService $categoryService)
    {
        try {
            $category = Category::withTrashed()->findOrFail($id);

            $category = $categoryService->restoreCategory($category);

            return ApiResponse::success(
                new CategoryResource($category),
                'Category restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Category not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore category');
        }
    }

    // Force delete permanently
    public function destroy($id, CategoryService $categoryService)
    {
        try {
            $category = Category::withTrashed()->findOrFail($id);
            $deleted = $categoryService->forceDeleteCategory($category);

            if ($deleted) {
                return ApiResponse::success(
                    null,
                    'Category permanently deleted'
                );
            }

            return ApiResponse::error(
                'Category is not in trash',
                400
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Category not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to delete category');
        }
    }
}
