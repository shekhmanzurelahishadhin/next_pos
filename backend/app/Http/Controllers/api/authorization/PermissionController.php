<?php

namespace App\Http\Controllers\api\authorization;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\authorization\permission\CreatePermissionRequest;
use App\Http\Requests\authorization\permission\UpdatePermissionRequest;
use App\Http\Resources\authorization\PermissionResource;
use App\Services\PermissionService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

// Permission Setup, and the module / menu / sub menu lists of its form
class PermissionController extends Controller
{
    public function __construct(private PermissionService $service)
    {
        $this->middleware('permission:permission.create|permission.view|permission.edit|permission.delete')->only('index');
        $this->middleware('permission:permission.create')->only('store');
        $this->middleware('permission:permission.edit')->only('update');
        $this->middleware('permission:permission.delete')->only('destroy');
    }

    public function index(Request $request)
    {
        try {
            $filters = $request->only('name', 'module_name', 'menu_name', 'sub_menu_name', 'created_at', 'updated_at');
            $permissions = $this->service->getPermissions($filters, $request->get('per_page'));

            $data = [
                'items' => PermissionResource::collection($permissions->items()),
                'total' => $permissions->total(),
                'current_page' => $permissions->currentPage(),
                'per_page' => $permissions->perPage(),
            ];

            return ApiResponse::success($data, 'Permissions retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to retrieve permission');
        }
    }

    public function store(CreatePermissionRequest $request)
    {
        try {
            $permission = $this->service->createPermission($request->validated());
            return ApiResponse::success(new PermissionResource($permission), 'Permission created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to create permission');
        }
    }

    public function update(UpdatePermissionRequest $request, Permission $permission)
    {
        try {
            $permission = $this->service->updatePermission($permission, $request->validated());
            return ApiResponse::success(new PermissionResource($permission), 'Permission updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to update permission');
        }
    }

    public function destroy(Permission $permission)
    {
        try {
            $this->service->deletePermission($permission);
            return ApiResponse::success(null, 'Permission permanently deleted');
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to delete permission');
        }
    }

    public function modules()
    {
        return response()->json($this->service->getModules());
    }

    public function menus(Request $request)
    {
        return response()->json($this->service->getMenus($request->query('module_id')));
    }

    public function subMenus(Request $request)
    {
        return response()->json($this->service->getSubMenus($request->query('menu_id')));
    }

    // Not found goes back as 404, any other error is logged and the general message is sent
    private function errorResponse(\Exception $e, string $message)
    {
        if ($e instanceof ModelNotFoundException) {
            return ApiResponse::notFound('Permission not found');
        }

        report($e);
        return ApiResponse::serverError($message);
    }
}
