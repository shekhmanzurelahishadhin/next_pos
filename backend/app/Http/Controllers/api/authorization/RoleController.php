<?php

namespace App\Http\Controllers\api\authorization;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\authorization\roles\CreateRoleRequest;
use App\Http\Requests\authorization\roles\UpdateRoleRequest;
use App\Http\Resources\authorization\RoleResource;
use App\Services\RoleService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Spatie\Permission\Models\Role;

// Role Setup and the permissions of a role
class RoleController extends Controller
{
    public function __construct(private RoleService $service)
    {
        $this->middleware('permission:role.create|role.view|role.edit|role.delete')->only('index');
        $this->middleware('permission:role.create')->only('store');
        $this->middleware('permission:role.edit')->only('update');
        $this->middleware('permission:role.delete')->only('destroy');
    }

    public function index(Request $request)
    {
        try {
            $filters = $request->only('name', 'guard_name', 'created_at', 'updated_at');
            // the role dropdowns ask only for some columns, e.g. id and name
            $columns = $request->get('columns', ['*']);
            $roles = $this->service->getRoles($filters, $request->get('per_page'), $columns);

            if ($roles instanceof LengthAwarePaginator) {
                $rows = $roles->items();
            } else {
                $rows = $roles;
            }

            $items = [];
            foreach ($rows as $role) {
                $items[] = new RoleResource($role, $columns);
            }

            if ($roles instanceof LengthAwarePaginator) {
                $data = [
                    'items' => $items,
                    'total' => $roles->total(),
                    'current_page' => $roles->currentPage(),
                    'per_page' => $roles->perPage(),
                ];
            } else {
                // all roles on one page
                $data = [
                    'items' => $items,
                    'total' => $roles->count(),
                    'current_page' => 1,
                    'per_page' => $roles->count(),
                ];
            }

            return ApiResponse::success($data, 'Roles retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to retrieve roles');
        }
    }

    public function store(CreateRoleRequest $request)
    {
        try {
            $role = $this->service->createRole($request->validated());
            return ApiResponse::success(new RoleResource($role), 'Role created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to create role');
        }
    }

    public function update(UpdateRoleRequest $request, Role $role)
    {
        try {
            $role = $this->service->updateRole($role, $request->validated());
            return ApiResponse::success(new RoleResource($role), 'Role updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to update role');
        }
    }

    public function destroy(Role $role)
    {
        try {
            $this->service->deleteRole($role);
            return ApiResponse::success(null, 'Role permanently deleted');
        } catch (\Exception $e) {
            return $this->errorResponse($e, 'Failed to delete role');
        }
    }

    // The role with the names of its permissions, for the Role Permissions page
    public function getPermissions($id)
    {
        $role = Role::findOrFail($id);
        $permissionNames = $this->service->getPermissionNames($role);

        return response()->json([
            'role' => $role,
            'permissions' => $permissionNames,
        ]);
    }

    public function assignPermissions(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        $this->service->assignPermissions($role, $request->input('permissions', []));

        return response()->json(['message' => 'Permissions updated successfully']);
    }

    // Not found goes back as 404, any other error is logged and the general message is sent
    private function errorResponse(\Exception $e, string $message)
    {
        if ($e instanceof ModelNotFoundException) {
            return ApiResponse::notFound('Role not found');
        }

        report($e);
        return ApiResponse::serverError($message);
    }
}
