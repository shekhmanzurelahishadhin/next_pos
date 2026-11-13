<?php

namespace App\Http\Controllers\api\sales;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\sales\SaleRequest;
use App\Models\sales\Sale;
use App\Models\sales\SaleDetail;
use App\Models\softConfig\Lookup;
use App\Services\sales\SaleService;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function __construct(private SaleService $service)
    {
        $this->middleware('permission:sale.create|sale.view|sale.edit|sale.delete|sale.approve')
            ->only('index', 'show', 'formOptions', 'searchCustomers', 'searchBarcodes');
        $this->middleware('permission:sale.create')->only('store');
        $this->middleware('permission:sale.edit')->only('update');
        $this->middleware('permission:sale.delete')->only('destroy', 'destroyItem');
        $this->middleware('permission:sale.approve')->only('approve');
    }

    // Sales Manage: one row per sold barcode
    public function index(Request $request)
    {
        $filters = $request->only('status', 'cash_due', 'so_no', 'customer_name', 'store_id', 'location_name',
            'product_name', 'part_number', 'barcode', 'order_date');
        $rows = $this->service->getSaleRows($filters, $request->get('per_page'));

        // add the status name to every row
        $data = [];
        foreach ($rows->items() as $row) {
            $item = (array) $row;
            $item['status_name'] = Sale::STATUS_NAMES[$row->status] ?? '';
            $data[] = $item;
        }

        return ApiResponse::success([
            'data'  => $data,
            'total' => $rows->total(),
        ], 'Sales retrieve successfully');
    }

    public function formOptions()
    {
        return ApiResponse::success($this->service->formOptions(), 'Sales form options');
    }

    public function searchCustomers(Request $request)
    {
        $term = trim((string) $request->get('term'));
        return ApiResponse::success($this->service->searchCustomers($term), 'Customers');
    }

    public function searchBarcodes(Request $request)
    {
        $term = trim((string) $request->get('term'));

        // 0 or empty = every company / no SO left out
        $companyId = $request->integer('company_id') ?: null;
        $exceptSaleId = $request->integer('sale_id') ?: null;

        return ApiResponse::success($this->service->searchBarcodes($term, $companyId, $exceptSaleId), 'Barcodes');
    }

    public function show(int $id)
    {
        $sale = $this->service->getSale($id);

        $data = $sale->toArray();
        $data['cash_due_name'] = $this->lookupName('cash_due', $sale->cash_due);
        $data['received_type_name'] = $this->lookupName('payment_type', $sale->received_type);
        $data['status_name'] = Sale::STATUS_NAMES[$sale->status] ?? '';
        $data['customer_due'] = $this->service->customerDue($sale->customer_id);

        return ApiResponse::success($data, 'Sale retrieve successfully');
    }

    public function store(SaleRequest $request)
    {
        try {
            $sale = $this->service->createSale($request->validated());
            return ApiResponse::success(['id' => $sale->id, 'so_no' => $sale->so_no], 'Data saved successfully.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(SaleRequest $request, Sale $sale)
    {
        try {
            $sale = $this->service->updateSale($sale, $request->validated());
            return ApiResponse::success(['id' => $sale->id, 'so_no' => $sale->so_no], 'Sale updated successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(Sale $sale)
    {
        try {
            $this->service->deleteSale($sale);
            return ApiResponse::success(null, 'Deleted Successfully!');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroyItem(SaleDetail $saleDetail)
    {
        try {
            $this->service->deleteSaleItem($saleDetail);
            return ApiResponse::success(null, 'Item deleted');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function approve(Sale $sale)
    {
        try {
            $this->service->approveSale($sale);
            return ApiResponse::success(null, 'Sale approved');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // name of a lookup code, e.g. cash_due 1 = "Cash"
    private function lookupName(string $type, $code)
    {
        return Lookup::where('type', $type)->where('code', $code)->value('name');
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
