<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\ChartOfAcRequest;
use App\Models\accounting\ChartOfAc;
use App\Services\accounting\ChartOfAcService;
use Illuminate\Http\Request;

// Chart of Accounts setup
class ChartOfAcController extends Controller
{
    public function __construct(private ChartOfAcService $service)
    {
        $this->middleware('permission:chart-of-ac.view|chart-of-ac.create|chart-of-ac.edit|chart-of-ac.delete')->only('index');
        $this->middleware('permission:chart-of-ac.create')->only('nextCode', 'store');
        $this->middleware('permission:chart-of-ac.edit')->only('update');
        $this->middleware('permission:chart-of-ac.delete')->only('deleteSelected');
    }

    // every head, the page shows them as a tree
    public function index()
    {
        return ApiResponse::success($this->service->getAccounts(), 'Chart of accounts retrieve successfully');
    }

    public function nextCode()
    {
        return ApiResponse::success(['code' => $this->service->nextCode()], 'Next code');
    }

    public function store(ChartOfAcRequest $request)
    {
        try {
            $account = $this->service->createAccount($request->validated());
            return ApiResponse::success($account, 'Data has been saved successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(ChartOfAcRequest $request, ChartOfAc $chartOfAc)
    {
        try {
            $account = $this->service->updateAccount($chartOfAc, $request->validated());
            return ApiResponse::success($account, 'Data has been updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function deleteSelected(Request $request)
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ], [
            'ids.required' => 'Please select atleast one Item to delete',
        ]);

        try {
            $count = $this->service->deleteSelected($request->input('ids'));
            return ApiResponse::success(['deleted' => $count], 'Selected items deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // a rule message goes back as it is, any other error is logged
    private function errorResponse(\Exception $e)
    {
        if ($e instanceof \RuntimeException) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        report($e);
        return ApiResponse::serverError('Something went wrong, please try again');
    }
}
