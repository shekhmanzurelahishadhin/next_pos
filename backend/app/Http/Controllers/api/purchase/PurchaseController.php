<?php

namespace App\Http\Controllers\api\purchase;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\purchase\DirectPurchaseRequest;
use App\Models\purchase\Purchase;
use App\Models\softConfig\Lookup;
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
        $filters = $request->only('status', 'po_no', 'supplier_id', 'supplier_name', 'store_id', 'cash_due', 'purchase_type',
            'part_number', 'product_name', 'location_name', 'purchase_date');
        $rows = $this->service->getPurchaseRows($filters, $request->get('per_page'));

        // add the status name to every row
        $data = [];
        foreach ($rows->items() as $row) {
            $item = (array) $row;
            $item['status_name'] = Purchase::STATUS_NAMES[$row->status] ?? '';
            $data[] = $item;
        }

        return ApiResponse::success([
            'data'         => $data,
            'total'        => $rows->total(),
            'current_page' => $rows->currentPage(),
            'per_page'     => $rows->perPage(),
        ], 'Purchases retrieve successfully');
    }

    public function show(int $id)
    {
        $purchase = $this->service->getPurchase($id);

        $data = $purchase->toArray();
        $data['cash_due_name'] = $this->lookupName('cash_due', $purchase->cash_due);
        $data['purchase_type_name'] = $this->lookupName('local_import', $purchase->purchase_type);
        $data['ship_by_name'] = $this->lookupName('ship_by', $purchase->ship_by);
        $data['payment_type_name'] = $this->lookupName('payment_type', $purchase->payment_type);
        $data['status_name'] = Purchase::STATUS_NAMES[$purchase->status] ?? '';
        $data['supplier_due'] = $this->service->supplierDue($purchase->supplier_id);

        return ApiResponse::success($data, 'Purchase retrieve successfully');
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

        // 0 or empty = all stores / locations
        $storeId = $request->integer('store_id') ?: null;
        $locationId = $request->integer('location_id') ?: null;

        return ApiResponse::success($this->service->searchProducts($term, $storeId, $locationId), 'Products');
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
        try {
            $purchase = $this->service->createPurchase($request->validated());
            return ApiResponse::success(['id' => $purchase->id, 'po_no' => $purchase->po_no], 'Purchase created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(DirectPurchaseRequest $request, Purchase $purchase)
    {
        try {
            $purchase = $this->service->updatePurchase($purchase, $request->validated());
            return ApiResponse::success(['id' => $purchase->id, 'po_no' => $purchase->po_no], 'Purchase updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(Purchase $purchase)
    {
        try {
            $this->service->deletePurchase($purchase);
            return ApiResponse::success(null, 'Purchase deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function approve(Purchase $purchase)
    {
        try {
            $this->service->approvePurchase($purchase);
            return ApiResponse::success(null, 'Purchase approved and received into stock');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function cancel(Purchase $purchase)
    {
        try {
            $this->service->cancelPurchase($purchase);
            return ApiResponse::success(null, 'Purchase cancelled');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function undoCancel(Purchase $purchase)
    {
        try {
            $this->service->undoCancelPurchase($purchase);
            return ApiResponse::success(null, 'Purchase cancellation undone');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // name of a lookup code, like cash_due "1" -> "Cash"
    private function lookupName(string $type, $code)
    {
        return Lookup::where('type', $type)->where('code', $code)->value('name');
    }

    // A business rule error (locked, duplicate ...) goes back as 422 with its message,
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
