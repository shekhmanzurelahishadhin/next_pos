<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\JournalEntryRequest;
use App\Models\accounting\VoucherType;
use App\Services\accounting\JournalEntryService;
use Illuminate\Http\Request;

// Voucher Entry: Journal, Contra, Cash Payment, Cash Receive, Bank Payment, Bank Receive
class JournalEntryController extends Controller
{
    public function __construct(private JournalEntryService $service)
    {
        $this->middleware('permission:voucher-entry.create')->only('heads', 'nextNo', 'store');
        // the update form adds lines too
        $this->middleware('permission:voucher-entry.create|voucher-entry.edit')->only('searchHeads');
        $this->middleware('permission:voucher-entry.view|voucher-entry.edit|voucher-entry.delete')->only('index', 'show');
        $this->middleware('permission:voucher-entry.edit')->only('update', 'toggleLock');
        $this->middleware('permission:voucher-entry.delete')->only('destroy');
    }

    public function update(JournalEntryRequest $request, $voucherType, $entryNo)
    {
        try {
            $result = $this->service->update($voucherType, $entryNo, $request->validated());
            return ApiResponse::success($result, 'successfully updated');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }

    // lock a voucher, or unlock a locked one
    public function toggleLock($voucherType, $entryNo)
    {
        try {
            $message = $this->service->toggleLock($voucherType, $entryNo);
            return ApiResponse::success(null, $message);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
    }

    // Voucher Manage list
    public function index(Request $request)
    {
        $filters = $request->only('date_from', 'date_to', 'voucher_type', 'voucher_no_from', 'voucher_no_to', 'entry_no', 'account', 'narration', 'cheque_no', 'created_by');
        $perPage = $request->integer('per_page', 20);
        $page = $request->integer('page', 1);
        return ApiResponse::success($this->service->getList($filters, $perPage, $page), 'Vouchers retrieve successfully');
    }

    // one voucher, for the preview
    public function show($voucherType, $entryNo)
    {
        try {
            return ApiResponse::success($this->service->findVoucher($voucherType, $entryNo), 'Voucher');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 404);
        }
    }

    public function destroy($voucherType, $entryNo)
    {
        try {
            $voucherNo = $this->service->deleteVoucher($voucherType, $entryNo);
            return ApiResponse::success(null, $voucherNo . ' deleted successfully');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }

    // Account Title list and the voucher type of the form
    public function heads(Request $request)
    {
        $request->validate([
            'voucher_type' => ['required', 'integer', 'exists:voucher_types,id'],
        ]);
        $voucherType = VoucherType::find($request->integer('voucher_type'));
        return ApiResponse::success([
            'heads' => $this->service->headOptions(),
            'voucher_type' => $voucherType,
        ], 'Account titles');
    }

    // account title autocomplete, at least 2 letters like parts_bazar
    public function searchHeads(Request $request)
    {
        return ApiResponse::success($this->service->searchHeads((string) $request->input('search_ca', '')), 'Account titles');
    }

    // the voucher no the next save will get
    public function nextNo(Request $request)
    {
        $request->validate([
            'voucher_type' => ['required', 'integer', 'exists:voucher_types,id'],
            'entry_date' => ['required', 'date'],
        ]);
        $voucherNo = $this->service->nextVoucherNo($request->integer('voucher_type'), $request->input('entry_date'));
        return ApiResponse::success(['voucher_no' => $voucherNo], 'Next voucher no');
    }

    public function store(JournalEntryRequest $request)
    {
        try {
            $result = $this->service->save($request->validated());
            return ApiResponse::success($result, 'Successfully Saved', 201);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
