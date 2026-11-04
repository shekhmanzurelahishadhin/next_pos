<?php

namespace App\Http\Controllers\api\inventory;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\inventory\StockTransferRequest;
use App\Models\inventory\StockTransfer;
use App\Services\inventory\StockTransferService;
use Illuminate\Http\Request;

class StockTransferController extends Controller
{
    public function __construct(private StockTransferService $service)
    {
        $this->middleware('permission:stock-transfer.create|stock-transfer.view|stock-transfer.edit|stock-transfer.delete|stock-transfer.approve')
            ->only('index', 'show');
        $this->middleware('permission:stock-transfer.create|stock-transfer.edit')->only('searchBarcodes');
        $this->middleware('permission:stock-transfer.create')->only('store');
        $this->middleware('permission:stock-transfer.edit')->only('update');
        $this->middleware('permission:stock-transfer.delete')->only('destroy');
        $this->middleware('permission:stock-transfer.approve')->only('approve');
    }

    // Stock Transfer Manage: one row per transfer
    public function index(Request $request)
    {
        $rows = $this->service->getRows(
            $request->only('transfer_no', 'transfer_date', 'created_by_name', 'approved_by_name', 'status'),
            $request->get('per_page')
        );
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Stock transfers retrieve successfully');
    }

    public function searchBarcodes(Request $request)
    {
        $term = trim((string) $request->get('term'));
        if (mb_strlen($term) < 2) {
            return ApiResponse::success([], 'Type at least 2 characters');
        }
        return ApiResponse::success(
            $this->service->searchBarcodes($term, $request->integer('company_id') ?: null, $request->integer('except_id') ?: null),
            'Barcodes'
        );
    }

    public function store(StockTransferRequest $request)
    {
        return $this->run(
            fn() => ['id' => $this->service->createTransfer($request->validated())->id],
            'Stock Transfer Saved Successfully.',
            201
        );
    }

    public function show(int $id)
    {
        return $this->run(fn() => $this->service->getTransfer($id), 'Stock transfer retrieve successfully');
    }

    public function update(StockTransferRequest $request, StockTransfer $stockTransfer)
    {
        return $this->run(
            fn() => ['id' => $this->service->updateTransfer($stockTransfer, $request->validated())->id],
            'Stock Transfer Updated Successfully.'
        );
    }

    public function approve(StockTransfer $stockTransfer)
    {
        return $this->run(fn() => $this->service->approveTransfer($stockTransfer), 'Stock Transfer Approved Successfully');
    }

    public function destroy(StockTransfer $stockTransfer)
    {
        return $this->run(fn() => $this->service->deleteTransfer($stockTransfer), 'Stock transfer deleted successfully');
    }

    // business rule errors go back as 422 with the message
    private function run(callable $action, string $message, int $code = 200)
    {
        try {
            return ApiResponse::success($action(), $message, $code);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('Stock transfer not found', 404);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
