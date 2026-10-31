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
        $rows = $this->service->getSaleRows(
            $request->only('status', 'cash_due', 'so_no', 'customer_name', 'store_id', 'location_name', 'product_name', 'part_number', 'barcode', 'order_date'),
            $request->get('per_page')
        );

        return ApiResponse::success([
            'data'  => collect($rows->items())->map(fn($row) => (array) $row + ['status_name' => Sale::STATUS_NAMES[$row->status] ?? '']),
            'total' => $rows->total(),
        ], 'Sales retrieve successfully');
    }

    public function formOptions()
    {
        return ApiResponse::success($this->service->formOptions(), 'Sales form options');
    }

    public function searchCustomers(Request $request)
    {
        return ApiResponse::success($this->service->searchCustomers(trim((string) $request->get('term'))), 'Customers');
    }

    public function searchBarcodes(Request $request)
    {
        return ApiResponse::success($this->service->searchBarcodes(
            trim((string) $request->get('term')),
            $request->integer('company_id') ?: null,
            $request->integer('sale_id') ?: null
        ), 'Barcodes');
    }

    public function show(int $id)
    {
        $sale = $this->service->getSale($id);
        $lookup = fn(string $type, $code) => Lookup::where('type', $type)->where('code', $code)->value('name');

        return ApiResponse::success($sale->toArray() + [
            'cash_due_name'      => $lookup('cash_due', $sale->cash_due),
            'received_type_name' => $lookup('payment_type', $sale->received_type),
            'status_name'        => Sale::STATUS_NAMES[$sale->status] ?? '',
            'customer_due'       => $this->service->customerDue($sale->customer_id),
        ], 'Sale retrieve successfully');
    }

    public function store(SaleRequest $request)
    {
        return $this->run(fn() => $this->service->createSale($request->validated()), 'Data saved successfully.', 201);
    }

    public function update(SaleRequest $request, Sale $sale)
    {
        return $this->run(fn() => $this->service->updateSale($sale, $request->validated()), 'Sale updated successfully.');
    }

    public function destroy(Sale $sale)
    {
        return $this->run(fn() => $this->service->deleteSale($sale), 'Deleted Successfully!');
    }

    public function destroyItem(SaleDetail $saleDetail)
    {
        return $this->run(fn() => $this->service->deleteSaleItem($saleDetail), 'Item deleted');
    }

    public function approve(Sale $sale)
    {
        return $this->run(fn() => $this->service->approveSale($sale), 'Sale approved');
    }

    // business rule errors go back as 422 with the message
    private function run(callable $action, string $message, int $code = 200)
    {
        try {
            $result = $action();
            $data = $result instanceof Sale ? ['id' => $result->id, 'so_no' => $result->so_no] : null;
            return ApiResponse::success($data, $message, $code);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
