<?php

namespace App\Http\Controllers\api\authorization;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\authorization\permission\CreatePermissionRequest;
use App\Http\Requests\authorization\permission\UpdatePermissionRequest;
use App\Http\Resources\authorization\PermissionResource;
use App\Models\authorization\Menu;
use App\Models\authorization\Module;
use App\Models\authorization\PermissionModel;
use App\Models\authorization\SubMenu;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use App\Services\PermissionService;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:permission.create|permission.view|permission.edit|permission.delete')->only('index');
        $this->middleware('permission:permission.create')->only('store');
        $this->middleware('permission:permission.edit')->only('update');
        $this->middleware('permission:permission.delete')->only('destroy');
    }

    public function index(Request $request, PermissionService $permissionService)
    {
        try {
            $perPage = $request->get('per_page'); // can be null
            $filters = $request->only('name','module_name','menu_name','sub_menu_name','created_at','updated_at');

            $permissions = $permissionService->getPermission($filters, $perPage);

            if ($permissions instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'items' => PermissionResource::collection($permissions->items()),
                    'total' => $permissions->total(),
                    'current_page' => $permissions->currentPage(),
                    'per_page' => $permissions->perPage(),
                ];
            }else {
                // Collection response (no pagination)
                $data = [
                    'items' => PermissionResource::collection($permissions),
                    'total' => $permissions->count(),
                    'current_page' => 1,
                    'per_page' => $permissions->count(),
                ];
            }

            return ApiResponse::success($data, 'Permissions retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve permission');
        }
    }

    public function store(CreatePermissionRequest $request,  PermissionService $permissionService)
    {
        try {
            $validatedData = $request->validated();

            $permission = $permissionService->createPermission($validatedData);

            return ApiResponse::success(
                new PermissionResource($permission),
                'Permission created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create permission');
        }
    }

    public function update(UpdatePermissionRequest $request, PermissionService $permissionService,  Permission $permission)
    {
        try {
            $permission = $permissionService->updatePermission($permission, $request->validated());

            return ApiResponse::success(
                new PermissionResource($permission),
                'Permission updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update permission');
        }
    }

    public function destroy(PermissionService $permissionService, Permission $permission)
    {
        try {
            $deleted = $permissionService->deletePermission($permission);

            if ($deleted) {
                return ApiResponse::success(
                    null,
                    'Permission permanently deleted'
                );
            }

            return ApiResponse::error(
                'Permission is not in trash',
                400
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Permission not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to delete permission');
        }
    }
    public function modules()
    {
        return response()->json(Module::select('id', 'name')->get());
    }

    public function menus(Request $request)
    {
        $moduleId = $request->query('module_id');

        $query = Menu::select('id', 'name', 'module_id');

        if ($moduleId) {
            $query->where('module_id', $moduleId);
        }

        return response()->json($query->get());
    }
    public function subMenus(Request $request)
    {
        $menuId = $request->query('menu_id');

        $query = SubMenu::select('id', 'name', 'menu_id');

        if ($menuId) {
            $query->where('menu_id', $menuId);
        }

        return response()->json($query->get());
    }

}
