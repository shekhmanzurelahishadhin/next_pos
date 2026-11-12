<?php

namespace App\Http\Controllers\api\inventory;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\inventory\StockTransferRequest;
use App\Models\inventory\StockTransfer;
use App\Services\inventory\StockTransferService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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
        $filters = $request->only('transfer_no', 'transfer_date', 'created_by_name', 'approved_by_name', 'status');
        $rows = $this->service->getRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Stock transfers retrieve successfully');
    }

    public function searchBarcodes(Request $request)
    {
        $term = trim((string) $request->get('term'));
        if (mb_strlen($term) < 2) {
            return ApiResponse::success([], 'Type at least 2 characters');
        }

        // 0 or empty = no company filter / no transfer being edited
        $companyId = $request->integer('company_id') ?: null;
        $exceptTransferId = $request->integer('except_id') ?: null;

        return ApiResponse::success($this->service->searchBarcodes($term, $companyId, $exceptTransferId), 'Barcodes');
    }

    public function store(StockTransferRequest $request)
    {
        try {
            $transfer = $this->service->createTransfer($request->validated());
            return ApiResponse::success(['id' => $transfer->id], 'Stock Transfer Saved Successfully.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function show(int $id)
    {
        try {
            return ApiResponse::success($this->service->getTransfer($id), 'Stock transfer retrieve successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(StockTransferRequest $request, StockTransfer $stockTransfer)
    {
        try {
            $transfer = $this->service->updateTransfer($stockTransfer, $request->validated());
            return ApiResponse::success(['id' => $transfer->id], 'Stock Transfer Updated Successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function approve(StockTransfer $stockTransfer)
    {
        try {
            $this->service->approveTransfer($stockTransfer);
            return ApiResponse::success(null, 'Stock Transfer Approved Successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(StockTransfer $stockTransfer)
    {
        try {
            $this->service->deleteTransfer($stockTransfer);
            return ApiResponse::success(null, 'Stock transfer deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // Not found goes back as 404, a business rule error as 422 with its message,
    // any other error is logged and a general message is sent
    private function errorResponse(\Exception $e)
    {
        if ($e instanceof ModelNotFoundException) {
            return ApiResponse::error('Stock transfer not found', 404);
        }
        if ($e instanceof \RuntimeException) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        report($e);
        return ApiResponse::serverError('Something went wrong, please try again');
    }
}
