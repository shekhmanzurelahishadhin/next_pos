<?php

namespace App\Http\Controllers\api\inventory;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\inventory\AuditNameRequest;
use App\Http\Requests\inventory\InventoryAuditRequest;
use App\Models\inventory\AuditName;
use App\Models\inventory\InventoryAudit;
use App\Services\inventory\InventoryAuditService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

// Audit Name Setup + Inventory Audit entry / manage
class InventoryAuditController extends Controller
{
    public function __construct(private InventoryAuditService $service)
    {
        $this->middleware('permission:audit-name.view|audit-name.create|audit-name.edit|audit-name.delete')->only('auditNames');
        $this->middleware('permission:audit-name.create')->only('storeAuditName');
        $this->middleware('permission:audit-name.edit')->only('updateAuditName');
        $this->middleware('permission:audit-name.delete')->only('destroyAuditName');

        $this->middleware('permission:inventory-audit.create|inventory-audit.view|inventory-audit.edit|inventory-audit.delete')->only('index', 'show');
        $this->middleware('permission:inventory-audit.create|inventory-audit.edit')->only('activeAuditNames', 'scan', 'locationStock');
        $this->middleware('permission:inventory-audit.create')->only('store');
        $this->middleware('permission:inventory-audit.edit')->only('update');
        $this->middleware('permission:inventory-audit.delete')->only('destroy');
    }

    // ---------- Audit Name Setup ----------

    public function auditNames(Request $request)
    {
        $rows = $this->service->getAuditNames($request->only('audit_name', 'status'), $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Audit names retrieve successfully');
    }

    public function storeAuditName(AuditNameRequest $request)
    {
        try {
            $auditName = $this->service->saveAuditName($request->validated());
            return ApiResponse::success($auditName, 'Audit name saved successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function updateAuditName(AuditNameRequest $request, AuditName $auditName)
    {
        try {
            $auditName = $this->service->saveAuditName($request->validated(), $auditName);
            return ApiResponse::success($auditName, 'Audit name updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroyAuditName(AuditName $auditName)
    {
        try {
            $this->service->deleteAuditName($auditName);
            return ApiResponse::success(null, 'Audit name deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // ---------- Audit Entry ----------

    public function activeAuditNames()
    {
        return ApiResponse::success($this->service->activeAuditNames(), 'Active audit names');
    }

    public function scan(Request $request)
    {
        $request->validate(['barcode' => ['required', 'string'], 'store_id' => ['required', 'integer']]);

        try {
            $line = $this->service->scanBarcode(trim($request->barcode), $request->integer('store_id'));
            return ApiResponse::success($line, 'Product found');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function locationStock(Request $request)
    {
        $request->validate(['store_id' => ['required', 'integer'], 'location_id' => ['required', 'integer']]);

        $lines = $this->service->locationStock($request->integer('store_id'), $request->integer('location_id'));
        return ApiResponse::success($lines, 'Location stock');
    }

    // Inventory Audit Manage: one row per audit
    public function index(Request $request)
    {
        $filters = $request->only('entry_no', 'audit_name_id', 'store_id', 'location_name', 'created_by_name');
        $rows = $this->service->getAuditRows($filters, $request->get('per_page'));

        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Inventory audits retrieve successfully');
    }

    public function store(InventoryAuditRequest $request)
    {
        try {
            $audit = $this->service->createAudit($request->validated());
            return ApiResponse::success(['id' => $audit->id], 'Inventory audit saved successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function show(int $id)
    {
        try {
            return ApiResponse::success($this->service->getAudit($id), 'Inventory audit retrieve successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(InventoryAuditRequest $request, InventoryAudit $inventoryAudit)
    {
        try {
            $audit = $this->service->updateAudit($inventoryAudit, $request->validated());
            return ApiResponse::success(['id' => $audit->id], 'Inventory audit updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(InventoryAudit $inventoryAudit)
    {
        try {
            $this->service->deleteAudit($inventoryAudit);
            return ApiResponse::success(null, 'Inventory audit deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // Not found goes back as 404, a business rule error as 422 with its message,
    // any other error is logged and a general message is sent
    private function errorResponse(\Exception $e)
    {
        if ($e instanceof ModelNotFoundException) {
            return ApiResponse::error('Inventory audit not found', 404);
        }
        if ($e instanceof \RuntimeException) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        report($e);
        return ApiResponse::serverError('Something went wrong, please try again');
    }
}
