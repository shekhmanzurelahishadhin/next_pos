<?php

namespace App\Http\Controllers\api\softConfig;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\product\CreateProductRequest;
use App\Http\Requests\softConfig\product\UpdateProductRequest;
use App\Http\Resources\softConfig\product\ProductResource;
use App\Models\softConfig\Product;
use App\Services\softConfig\ProductService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:product.create|product.view|product.edit|product.delete')->only('index', 'modelList');
        $this->middleware('permission:product.create')->only('store');
        $this->middleware('permission:product.edit')->only('update');
        $this->middleware('permission:product.delete')->only('destroy');
    }

    // Vehicle model names for the table filter
    public function modelList(ProductService $productService)
    {
        return ApiResponse::success($productService->getModelList(), 'Model list retrieve successfully');
    }

    public function index(Request $request, ProductService $productService)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('search','status','name','part_number','model','unit_id','alert_qty','category_name','sub_category_name','brand_name','created_by');
            $categoryId = $request->query('category_id');
            $subCategoryId = $request->query('sub_category_id');
            $brandId = $request->query('brand_id');
            $modelId = $request->query('model_id');
            $products = $productService->getProducts($filters, $perPage, $categoryId, $subCategoryId, $brandId, $modelId);

            if ($products instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'data' => ProductResource::collection($products->items()),
                    'total' => $products->total(),
                    'current_page' => $products->currentPage(),
                    'per_page' => $products->perPage(),
                ];
            }else{
                // Collection response (no pagination)
                $data = [
                    'data' => ProductResource::collection($products),
                    'total' => $products->count(),
                    'current_page' => 1,
                    'per_page' => $products->count(),
                ];
            }

            return ApiResponse::success($data, 'Products retrieved successfully');
        }catch (\Exception $exception){
            return ApiResponse::serverError('Failed to retrieve Products');
        }
    }

    public function store(CreateProductRequest $request, ProductService $productService)
    {
        try {
            $validatedData = $request->validated();

            $product = $productService->createProduct($validatedData);

            return ApiResponse::success(
                new ProductResource($product),
                'Product created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create Product');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $product = Product::find($id);

            return ApiResponse::success(
                new ProductResource($product),
                'Product retrieved successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieved Product');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProductRequest $request, ProductService $productService, Product $product)
    {
        try {
            $product = $productService->updateProduct($product, $request->validated());

            return ApiResponse::success(
                new ProductResource($product),
                'Product updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update product');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(Product $product, ProductService $productService)
    {
        try {
            $productService->softDeleteProduct($product);

            return ApiResponse::success(
                null,
                'Product moved to trash successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move product to trash');
        }
    }

    // Restore soft-deleted brand
    public function restore($id, ProductService $productService)
    {
        try {
            $product = Product::withTrashed()->findOrFail($id);

            $product = $productService->restoreProduct($product);

            return ApiResponse::success(
                new ProductResource($product),
                'Product restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Product not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore product');
        }
    }

    // Force delete permanently
    public function destroy($id, ProductService $productService)
    {
        $product = Product::withTrashed()->findOrFail($id);
        $deleted = $productService->forceDeleteProduct($product);

        if ($deleted) {
            return response()->json([
                'message' => 'Product permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Product is not in trash',
        ], 400);
    }
}
