<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\CostCategoryRequest;
use App\Models\accounting\CostCategory;
use App\Services\accounting\CostCenterService;
use Illuminate\Http\Request;

// Cost Category setup, add and update only (parts_bazar has no delete)
class CostCategoryController extends Controller
{
    public function __construct(private CostCenterService $service)
    {
        $this->middleware('permission:cost-category.view|cost-category.create|cost-category.edit')->only('index');
        $this->middleware('permission:cost-category.create')->only('store');
        $this->middleware('permission:cost-category.edit')->only('update');
    }

    public function index(Request $request)
    {
        $rows = $this->service->getCategories($request->only('title', 'status'));
        return ApiResponse::success($rows, 'Cost categories retrieve successfully');
    }

    public function store(CostCategoryRequest $request)
    {
        $row = $this->service->saveCategory($request->validated());
        return ApiResponse::success($row, 'Data saved successfully.', 201);
    }

    public function update(CostCategoryRequest $request, CostCategory $costCategory)
    {
        $row = $this->service->saveCategory($request->validated(), $costCategory);
        return ApiResponse::success($row, 'successfully updated');
    }
}
