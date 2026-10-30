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
        $rows = $this->service->getReturnRows(
            $request->only('return_no', 'po_no', 'supplier_name', 'store_id', 'location_name', 'product_name', 'part_number'),
            $request->get('per_page')
        );
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Purchase returns retrieve successfully');
    }

    // Purchase Return page: items of approved POs
    public function returnable(Request $request)
    {
        $rows = $this->service->getReturnableRows(
            $request->only('po_no', 'supplier_name', 'store_id', 'location_name', 'product_name', 'part_number'),
            $request->get('per_page')
        );
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Returnable items retrieve successfully');
    }

    public function form(Purchase $purchase)
    {
        return $this->run(fn() => $this->service->returnForm($purchase), 'Return form');
    }

    public function store(PurchaseReturnRequest $request)
    {
        $purchase = Purchase::findOrFail($request->purchase_id);
        return $this->run(function () use ($purchase, $request) {
            $return = $this->service->createReturn($purchase, $request->validated());
            return ['id' => $return->id, 'return_no' => $return->return_no];
        }, 'Successfully Returned', 201);
    }

    public function show(int $id)
    {
        return ApiResponse::success($this->service->getReturn($id), 'Purchase return retrieve successfully');
    }

    public function destroy(PurchaseReturn $purchaseReturn)
    {
        return $this->run(fn() => $this->service->deleteReturn($purchaseReturn), 'Purchase return deleted successfully');
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
