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
    const FILTERS = ['so_no', 'customer_name', 'memo_no', 'store_id', 'location_name', 'product_name', 'part_number', 'barcode'];

    public function __construct(private SaleReturnService $service)
    {
        $this->middleware('permission:sale-return.create|sale-return.view|sale-return.delete')->only('index', 'show');
        $this->middleware('permission:sale-return.create')->only('returnable', 'form', 'store');
        $this->middleware('permission:sale-return.delete')->only('destroy');
    }

    // Sales Return Manage: one row per returned barcode
    public function index(Request $request)
    {
        $rows = $this->service->getReturnRows(
            $request->only('return_no', ...self::FILTERS),
            $request->get('per_page')
        );
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Sales returns retrieve successfully');
    }

    // Sales Return page: sold barcodes of approved SOs
    public function returnable(Request $request)
    {
        $rows = $this->service->getReturnableRows($request->only(self::FILTERS), $request->get('per_page'));
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Returnable items retrieve successfully');
    }

    public function form(Sale $sale)
    {
        return $this->run(fn() => $this->service->returnForm($sale), 'Return form');
    }

    public function store(SaleReturnRequest $request)
    {
        $sale = Sale::findOrFail($request->sale_id);
        return $this->run(function () use ($sale, $request) {
            $return = $this->service->createReturn($sale, $request->validated());
            return ['id' => $return->id, 'return_no' => $return->return_no];
        }, 'Successfully Returned', 201);
    }

    public function show(int $id)
    {
        return ApiResponse::success($this->service->getReturn($id), 'Sales return retrieve successfully');
    }

    public function destroy(SaleReturn $saleReturn)
    {
        return $this->run(fn() => $this->service->deleteReturn($saleReturn), 'Sales return deleted successfully');
    }

    // business rule errors go back as 422 with the message
    private function run(callable $action, string $message, int $code = 200)
    {
        try {
            return ApiResponse::success($action(), $message, $code);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
