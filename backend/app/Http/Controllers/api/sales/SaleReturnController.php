<?php

namespace App\Http\Controllers\api\sales;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\sales\SaleReturnRequest;
use App\Models\sales\Sale;
use App\Models\sales\SaleReturn;
use App\Services\sales\SaleReturnService;
use Illuminate\Http\Request;

class SaleReturnController extends Controller
{
    public function __construct(private SaleReturnService $service)
    {
        $this->middleware('permission:sale-return.create|sale-return.view|sale-return.delete')->only('index', 'show');
        $this->middleware('permission:sale-return.create')->only('returnable', 'form', 'store');
        $this->middleware('permission:sale-return.delete')->only('destroy');
    }

    // Sales Return Manage: one row per returned barcode
    public function index(Request $request)
    {
        $filters = $request->only('return_no', 'so_no', 'customer_name', 'memo_no', 'store_id', 'location_name',
            'product_name', 'part_number', 'barcode');
        $rows = $this->service->getReturnRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Sales returns retrieve successfully');
    }

    // Sales Return page: sold barcodes of approved SOs
    public function returnable(Request $request)
    {
        $filters = $request->only('so_no', 'customer_name', 'memo_no', 'store_id', 'location_name',
            'product_name', 'part_number', 'barcode');
        $rows = $this->service->getReturnableRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Returnable items retrieve successfully');
    }

    public function form(Sale $sale)
    {
        try {
            return ApiResponse::success($this->service->returnForm($sale), 'Return form');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function store(SaleReturnRequest $request)
    {
        $sale = Sale::findOrFail($request->sale_id);

        try {
            $return = $this->service->createReturn($sale, $request->validated());
            return ApiResponse::success(['id' => $return->id, 'return_no' => $return->return_no], 'Successfully Returned', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function show(int $id)
    {
        return ApiResponse::success($this->service->getReturn($id), 'Sales return retrieve successfully');
    }

    public function destroy(SaleReturn $saleReturn)
    {
        try {
            $this->service->deleteReturn($saleReturn);
            return ApiResponse::success(null, 'Sales return deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // A business rule error goes back as 422 with its message,
    // any other error is logged and a general message is sent
    private function errorResponse(\Exception $e)
    {
        if ($e instanceof \RuntimeException) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        report($e);
        return ApiResponse::serverError('Something went wrong, please try again');
    }
}
