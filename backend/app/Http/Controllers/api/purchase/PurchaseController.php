<?php

namespace App\Http\Controllers\api\purchase;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\purchase\DirectPurchaseRequest;
use App\Models\purchase\Purchase;
use App\Services\purchase\PurchaseService;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function __construct(private PurchaseService $service)
    {
        $this->middleware('permission:purchase.create|purchase.view|purchase.edit|purchase.delete|purchase.approve')
            ->only('index', 'show', 'formOptions', 'searchProducts', 'searchSuppliers');
        $this->middleware('permission:purchase.create')->only('store');
        $this->middleware('permission:purchase.edit')->only('update');
        $this->middleware('permission:purchase.delete')->only('destroy', 'cancel', 'undoCancel');
        $this->middleware('permission:purchase.approve')->only('approve');
    }

    // Purchase Manage: one row per purchased item
    public function index(Request $request)
    {
        $rows = $this->service->getPurchaseRows(
            $request->only('status', 'po_no', 'supplier_id', 'supplier_name', 'store_id', 'cash_due', 'purchase_type', 'part_number', 'product_name', 'purchase_date'),
            $request->get('per_page')
        );

        return ApiResponse::success([
            'data'         => collect($rows->items())->map(fn($row) => (array) $row + [
                'status_name' => Purchase::STATUS_NAMES[$row->status] ?? '',
            ]),
            'total'        => $rows->total(),
            'current_page' => $rows->currentPage(),
            'per_page'     => $rows->perPage(),
        ], 'Purchases retrieve successfully');
    }

    public function show(int $id)
    {
        $purchase = $this->service->getPurchase($id);
        $lookup = fn(string $type, $code) => \App\Models\softConfig\Lookup::where('type', $type)->where('code', $code)->value('name');

        return ApiResponse::success($purchase->toArray() + [
            'cash_due_name'      => $lookup('cash_due', $purchase->cash_due),
            'purchase_type_name' => $lookup('local_import', $purchase->purchase_type),
            'ship_by_name'       => $lookup('ship_by', $purchase->ship_by),
            'payment_type_name'  => $lookup('payment_type', $purchase->payment_type),
            'status_name'  => Purchase::STATUS_NAMES[$purchase->status] ?? '',
            'supplier_due' => $this->service->supplierDue($purchase->supplier_id),
        ], 'Purchase retrieve successfully');
    }

    public function formOptions()
    {
        return ApiResponse::success($this->service->formOptions(), 'Purchase form options');
    }

    public function searchProducts(Request $request)
    {
        $term = trim((string) $request->get('term'));
        if (mb_strlen($term) < 2) {
            return ApiResponse::success([], 'Type at least 2 characters');
        }
        return ApiResponse::success(
            $this->service->searchProducts($term, $request->integer('store_id') ?: null, $request->integer('location_id') ?: null),
            'Products'
        );
    }

    public function searchSuppliers(Request $request)
    {
        $term = trim((string) $request->get('term'));
        if (mb_strlen($term) < 2) {
            return ApiResponse::success([], 'Type at least 2 characters');
        }
        return ApiResponse::success($this->service->searchSuppliers($term), 'Suppliers');
    }

    public function store(DirectPurchaseRequest $request)
    {
        return $this->run(fn() => $this->service->createPurchase($request->validated()), 'Purchase created successfully', 201);
    }

    public function update(DirectPurchaseRequest $request, Purchase $purchase)
    {
        return $this->run(fn() => $this->service->updatePurchase($purchase, $request->validated()), 'Purchase updated successfully');
    }

    public function destroy(Purchase $purchase)
    {
        return $this->run(fn() => $this->service->deletePurchase($purchase), 'Purchase deleted successfully');
    }

    public function approve(Purchase $purchase)
    {
        return $this->run(fn() => $this->service->approvePurchase($purchase), 'Purchase approved and received into stock');
    }

    public function cancel(Purchase $purchase)
    {
        return $this->run(fn() => $this->service->cancelPurchase($purchase), 'Purchase cancelled');
    }

    public function undoCancel(Purchase $purchase)
    {
        return $this->run(fn() => $this->service->undoCancelPurchase($purchase), 'Purchase cancellation undone');
    }

    // Business rule errors (locked, duplicate ...) go back as a 422 message
    private function run(callable $action, string $message, int $code = 200)
    {
        try {
            $result = $action();
            $data = $result instanceof Purchase ? ['id' => $result->id, 'po_no' => $result->po_no] : null;
            return ApiResponse::success($data, $message, $code);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
