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
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:role.create|role.view|role.edit|role.delete')->only('index');
        $this->middleware('permission:role.create')->only('store');
        $this->middleware('permission:role.edit')->only('update');
        $this->middleware('permission:role.delete')->only('destroy');
    }

    public function index(Request $request, RoleService $roleService)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('name','guard_name','created_at','updated_at');
            $columns = $request->get('columns', ['*']); // Default all columns
            $roles = $roleService->getRoles($filters, $perPage, $columns);

            if ($roles instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                $items = collect($roles->items())->map(fn($role) => new RoleResource((object) $role, $columns));
                // Paginated response
                $data = [
                    'items' => $items,
                    'total' => $roles->total(),
                    'current_page' => $roles->currentPage(),
                    'per_page' => $roles->perPage(),
                ];
            }else {
                // Collection response (no pagination)
                $items = collect($roles)->map(fn($role) => new RoleResource((object) $role, $columns));
                $data = [
                    'items' => $items,
                    'total' => $roles->count(),
                    'current_page' => 1,
                    'per_page' => $roles->count(),
                ];
            }

            return ApiResponse::success($data, 'Roles retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve roles'.$e);
        }
    }


    public function store(CreateRoleRequest $request,  RoleService $roleService)
    {
        try {
            $validatedData = $request->validated();

            $role = $roleService->createRole($validatedData);

            return ApiResponse::success(
                new RoleResource($role),
                'Role created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create role');
        }
    }

    public function update(UpdateRoleRequest $request, RoleService $roleService,  Role $role)
    {
        try {
            $role = $roleService->updateRole($role, $request->validated());

            return ApiResponse::success(
                new RoleResource($role),
                'Role updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update role');
        }
    }

    public function destroy(RoleService $roleService, Role $role)
    {
        try {
            $deleted = $roleService->deleteRole($role);

            if ($deleted) {
                return ApiResponse::success(
                    null,
                    'Role permanently deleted'
                );
            }

            return ApiResponse::error(
                'Role is not in trash',
                400
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Role not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to delete role');
        }
    }

    // RoleController.php
    public function getPermissions($id)
    {
        $role = Role::findOrFail($id);
        return response()->json([
            'role' => $role,
            'permissions' => $role->permissions->pluck('name'),
        ]);
    }

    public function assignPermissions(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        $permissions = $request->input('permissions', []);
        $role->syncPermissions($permissions);

        return response()->json(['message' => 'Permissions updated successfully']);
    }

}
