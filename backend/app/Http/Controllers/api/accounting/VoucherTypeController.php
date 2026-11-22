<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\VoucherTypeRequest;
use App\Models\accounting\VoucherType;
use App\Services\accounting\VoucherTypeService;
use Illuminate\Http\Request;

// Voucher Type setup: list and update the number format
class VoucherTypeController extends Controller
{
    public function __construct(private VoucherTypeService $service)
    {
        $this->middleware('permission:voucher-type.view|voucher-type.edit')->only('index');
        $this->middleware('permission:voucher-type.edit')->only('update');
    }

    public function index(Request $request)
    {
        $rows = $this->service->getList($request->only('id', 'type_format'));
        return ApiResponse::success($rows, 'Voucher types retrieve successfully');
    }

    public function update(VoucherTypeRequest $request, VoucherType $voucherType)
    {
        try {
            $row = $this->service->update($voucherType, $request->validated());
            return ApiResponse::success($row, 'successfully updated');
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
