<?php

namespace App\Http\Controllers\api\inventory;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\inventory\AuditNameRequest;
use App\Http\Requests\inventory\InventoryAuditRequest;
use App\Models\inventory\AuditName;
use App\Models\inventory\InventoryAudit;
use App\Services\inventory\InventoryAuditService;
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

    public function auditNames(Request $request)
    {
        $rows = $this->service->getAuditNames($request->only('audit_name', 'status'), $request->get('per_page'));
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Audit names retrieve successfully');
    }

    public function storeAuditName(AuditNameRequest $request)
    {
        return $this->run(fn() => $this->service->saveAuditName($request->validated()), 'Audit name saved successfully', 201);
    }

    public function updateAuditName(AuditNameRequest $request, AuditName $auditName)
    {
        return $this->run(fn() => $this->service->saveAuditName($request->validated(), $auditName), 'Audit name updated successfully');
    }

    public function destroyAuditName(AuditName $auditName)
    {
        return $this->run(fn() => $this->service->deleteAuditName($auditName), 'Audit name deleted successfully');
    }

    public function activeAuditNames()
    {
        return ApiResponse::success($this->service->activeAuditNames(), 'Active audit names');
    }

    public function scan(Request $request)
    {
        $request->validate(['barcode' => ['required', 'string'], 'store_id' => ['required', 'integer']]);
        return $this->run(fn() => $this->service->scanBarcode(trim($request->barcode), $request->integer('store_id')), 'Product found');
    }

    public function locationStock(Request $request)
    {
        $request->validate(['store_id' => ['required', 'integer'], 'location_id' => ['required', 'integer']]);
        return ApiResponse::success($this->service->locationStock($request->integer('store_id'), $request->integer('location_id')), 'Location stock');
    }

    // Inventory Audit Manage: one row per audit
    public function index(Request $request)
    {
        $rows = $this->service->getAuditRows(
            $request->only('entry_no', 'audit_name_id', 'store_id', 'location_name', 'created_by_name'),
            $request->get('per_page')
        );
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Inventory audits retrieve successfully');
    }

    public function store(InventoryAuditRequest $request)
    {
        return $this->run(fn() => ['id' => $this->service->createAudit($request->validated())->id], 'Inventory audit saved successfully', 201);
    }

    public function show(int $id)
    {
        return $this->run(fn() => $this->service->getAudit($id), 'Inventory audit retrieve successfully');
    }

    public function update(InventoryAuditRequest $request, InventoryAudit $inventoryAudit)
    {
        return $this->run(fn() => ['id' => $this->service->updateAudit($inventoryAudit, $request->validated())->id], 'Inventory audit updated successfully');
    }

    public function destroy(InventoryAudit $inventoryAudit)
    {
        return $this->run(fn() => $this->service->deleteAudit($inventoryAudit), 'Inventory audit deleted successfully');
    }

    // business rule errors go back as 422 with the message
    private function run(callable $action, string $message, int $code = 200)
    {
        try {
            return ApiResponse::success($action(), $message, $code);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('Inventory audit not found', 404);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Something went wrong, please try again');
        }
    }
}
