<?php

namespace App\Http\Controllers\api\purchase;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\purchase\PurchaseReturnRequest;
use App\Models\purchase\Purchase;
use App\Models\purchase\PurchaseReturn;
use App\Services\purchase\PurchaseReturnService;
use Illuminate\Http\Request;

class PurchaseReturnController extends Controller
{
    public function __construct(private PurchaseReturnService $service)
    {
        $this->middleware('permission:purchase-return.create|purchase-return.view|purchase-return.delete')->only('index', 'show');
        $this->middleware('permission:purchase-return.create')->only('returnable', 'form', 'store');
        $this->middleware('permission:purchase-return.delete')->only('destroy');
    }

    // Purchase Return Manage: one row per returned item
    public function index(Request $request)
    {
        $filters = $request->only('return_no', 'po_no', 'supplier_name', 'store_id', 'location_name', 'product_name', 'part_number');
        $rows = $this->service->getReturnRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Purchase returns retrieve successfully');
    }

    // Purchase Return page: items of approved POs
    public function returnable(Request $request)
    {
        $filters = $request->only('po_no', 'supplier_name', 'store_id', 'location_name', 'product_name', 'part_number');
        $rows = $this->service->getReturnableRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Returnable items retrieve successfully');
    }

    public function form(Purchase $purchase)
    {
        try {
            return ApiResponse::success($this->service->returnForm($purchase), 'Return form');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function store(PurchaseReturnRequest $request)
    {
        $purchase = Purchase::findOrFail($request->purchase_id);

        try {
            $return = $this->service->createReturn($purchase, $request->validated());
            return ApiResponse::success(['id' => $return->id, 'return_no' => $return->return_no], 'Successfully Returned', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function show(int $id)
    {
        return ApiResponse::success($this->service->getReturn($id), 'Purchase return retrieve successfully');
    }

    public function destroy(PurchaseReturn $purchaseReturn)
    {
        try {
            $this->service->deleteReturn($purchaseReturn);
            return ApiResponse::success(null, 'Purchase return deleted successfully');
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
