<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\CostCenterRequest;
use App\Models\accounting\CostCenter;
use App\Services\accounting\CostCenterService;
use Illuminate\Http\Request;

// Cost Center setup, add and update only (parts_bazar has no delete)
class CostCenterController extends Controller
{
    public function __construct(private CostCenterService $service)
    {
        $this->middleware('permission:cost-center.view|cost-center.create|cost-center.edit')->only('index');
        $this->middleware('permission:cost-center.create')->only('store');
        $this->middleware('permission:cost-center.edit')->only('update');
    }

    public function index(Request $request)
    {
        $rows = $this->service->getCenters($request->only('cost_category_id', 'title', 'code', 'status'));
        return ApiResponse::success(['data' => $rows, 'categories' => $this->service->categoryOptions()], 'Cost centers retrieve successfully');
    }

    // active cost centers, for the voucher line
    public function options()
    {
        return ApiResponse::success($this->service->centerOptions(), 'Cost centers');
    }

    public function store(CostCenterRequest $request)
    {
        $row = $this->service->saveCenter($request->validated());
        return ApiResponse::success($row, 'Data saved successfully.', 201);
    }

    public function update(CostCenterRequest $request, CostCenter $costCenter)
    {
        $row = $this->service->saveCenter($request->validated(), $costCenter);
        return ApiResponse::success($row, 'successfully updated');
    }
}
