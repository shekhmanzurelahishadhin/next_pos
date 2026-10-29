<?php

namespace App\Http\Controllers\api\softConfig;

use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\model\CreateModelRequest;
use App\Http\Requests\softConfig\model\UpdateModelRequest;
use App\Http\Resources\softConfig\model\ModelResource;
use App\Models\softConfig\ProductModel;
use App\Services\softConfig\ModelService;
use Illuminate\Http\Request;

class ProductModelController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:model.create|model.view|model.edit|model.delete')->only('index');
        $this->middleware('permission:model.create')->only('store');
        $this->middleware('permission:model.edit')->only('update');
        $this->middleware('permission:model.delete')->only('destroy');
    }

    public function index(Request $request, ModelService $modelService)
    {
        $perPage = $request->get('per_page');
        $filters = $request->only('search','status','name','category_name','sub_category_name','brand_name','created_at','created_by');
        $categoryId = $request->query('category_id');
        $subCategoryId = $request->query('sub_category_id');
        $brandId = $request->query('brand_id');
        $productModels = $modelService->getModels($filters, $perPage, $categoryId, $subCategoryId, $brandId);

        if ($productModels instanceof \Illuminate\Pagination\LengthAwarePaginator) {
            // Paginated response
            return response()->json([
                'data' => ModelResource::collection($productModels->items()),
                'total' => $productModels->total(),
                'current_page' => $productModels->currentPage(),
                'per_page' => $productModels->perPage(),
            ]);
        }

        // Collection response (no pagination)
        return response()->json([
            'data' => ModelResource::collection($productModels),
            'total' => $productModels->count(),
            'current_page' => 1,
            'per_page' => $productModels->count(),
        ]);
    }

    public function store(CreateModelRequest $request, ModelService $modelService)
    {
        $validatedData = $request->validated();

        $productModel = $modelService->createModel($validatedData);

        return response()->json([
            'message' => 'Model created successfully',
            'data' => new ModelResource($productModel),
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateModelRequest $request, ModelService $modelService, ProductModel $product_model)
    {

        $product_model = $modelService->updateModel($product_model, $request->validated());

        return response()->json([
            'message' => 'Model updated successfully',
            'data' => new ModelResource($product_model),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(ProductModel $product_model, ModelService $modelService)
    {
        $modelService->softDeleteModel($product_model);

        return response()->json([
            'message' => 'Model moved to trash successfully',
        ]);
    }

    // Restore soft-deleted brand
    public function restore($id, ModelService $modelService)
    {
        $product_model = ProductModel::withTrashed()->findOrFail($id);

        $product_model = $modelService->restoreModel($product_model);

        return response()->json([
            'message' => 'Model restored successfully',
            'data' => $product_model,
        ]);
    }

    // Force delete permanently
    public function destroy($id, ModelService $modelService)
    {
        $product_model = ProductModel::withTrashed()->findOrFail($id);
        $deleted = $modelService->forceDeleteModel($product_model);

        if ($deleted) {
            return response()->json([
                'message' => 'Model permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Model is not in trash',
        ], 400);
    }

}
