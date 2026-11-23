<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\accounting\ChequeEntry;
use App\Services\accounting\ChequeEntryService;
use Illuminate\Http\Request;

// Cheque Entry register: list, cheque print and clearance date
class ChequeEntryController extends Controller
{
    public function __construct(private ChequeEntryService $service)
    {
        $this->middleware('permission:cheque-entry.view|cheque-entry.edit')->only('index', 'show');
        $this->middleware('permission:cheque-entry.edit')->only('clearance');
    }

    public function index(Request $request)
    {
        $filters = $request->only('max_sl', 'date_from', 'date_to', 'cb_bank_id', 'payment_type', 'payment_name', 'cheque_no', 'note', 'clearance');
        $perPage = $request->integer('per_page', 20);
        $page = $request->integer('page', 1);
        return ApiResponse::success($this->service->getList($filters, $perPage, $page), 'Cheque entries retrieve successfully');
    }

    public function show(ChequeEntry $chequeEntry)
    {
        $chequeEntry->load('bank:id,title');
        return ApiResponse::success($chequeEntry, 'Cheque entry');
    }

    public function clearance(Request $request, ChequeEntry $chequeEntry)
    {
        $data = $request->validate(
            ['clearance_date' => ['required', 'date']],
            ['clearance_date.required' => 'Clearance Date cannot be blank.']
        );
        try {
            $entry = $this->service->setClearance($chequeEntry, $data['clearance_date']);
            return ApiResponse::success($entry, 'successfully updated');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
    }
}
