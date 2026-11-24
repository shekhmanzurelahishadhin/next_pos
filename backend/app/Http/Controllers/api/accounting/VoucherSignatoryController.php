<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\VoucherSignatoryRequest;
use App\Models\accounting\VoucherSignatory;
use App\Services\accounting\VoucherSignatoryService;
use Illuminate\Http\Request;

// Voucher Signatory Setup, add and update only (parts_bazar has no delete)
class VoucherSignatoryController extends Controller
{
    public function __construct(private VoucherSignatoryService $service)
    {
        $this->middleware('permission:voucher-signatory.view|voucher-signatory.create|voucher-signatory.edit')->only('index');
        $this->middleware('permission:voucher-signatory.create')->only('store');
        $this->middleware('permission:voucher-signatory.edit')->only('update');
    }

    public function index(Request $request)
    {
        $rows = $this->service->getList($request->only('voucher_type', 'signatory_name', 'order_qty', 'status'));
        return ApiResponse::success($rows, 'Voucher signatories retrieve successfully');
    }

    public function store(VoucherSignatoryRequest $request)
    {
        $row = $this->service->save($request->validated());
        return ApiResponse::success($row, 'Data saved successfully.', 201);
    }

    public function update(VoucherSignatoryRequest $request, VoucherSignatory $voucherSignatory)
    {
        $row = $this->service->save($request->validated(), $voucherSignatory);
        return ApiResponse::success($row, 'successfully updated');
    }
}
