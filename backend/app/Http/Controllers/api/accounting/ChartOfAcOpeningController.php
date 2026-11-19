<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\ChartOfAcOpeningRequest;
use App\Models\accounting\ChartOfAcOpening;
use App\Services\accounting\ChartOfAcOpeningService;
use Illuminate\Http\Request;

// Chart Of AC Opening
class ChartOfAcOpeningController extends Controller
{
    public function __construct(private ChartOfAcOpeningService $service)
    {
        $this->middleware('permission:chart-of-ac-opening.view|chart-of-ac-opening.create|chart-of-ac-opening.edit|chart-of-ac-opening.delete')->only('index');
        $this->middleware('permission:chart-of-ac-opening.create|chart-of-ac-opening.edit')->only('heads');
        $this->middleware('permission:chart-of-ac-opening.create')->only('store');
        $this->middleware('permission:chart-of-ac-opening.edit')->only('update');
        $this->middleware('permission:chart-of-ac-opening.delete')->only('destroy');
    }

    public function index(Request $request)
    {
        $filters = $request->only('ca_head', 'opening_amount_date', 'currency_id', 'transaction_type', 'created_by', 'updated_by');
        return ApiResponse::success($this->service->getList($filters, $request->get('per_page')), 'Openings retrieve successfully');
    }

    // CA Head list for the form
    public function heads()
    {
        return ApiResponse::success($this->service->headOptions(), 'CA heads');
    }

    public function store(ChartOfAcOpeningRequest $request)
    {
        try {
            $row = $this->service->save($request->validated());
            return ApiResponse::success($row, 'Data saved successfully.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(ChartOfAcOpeningRequest $request, ChartOfAcOpening $chartOfAcOpening)
    {
        try {
            $row = $this->service->save($request->validated(), $chartOfAcOpening);
            return ApiResponse::success($row, 'successfully updated');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(ChartOfAcOpening $chartOfAcOpening)
    {
        $this->service->delete($chartOfAcOpening);
        return ApiResponse::success(null, 'Deleted successfully');
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
