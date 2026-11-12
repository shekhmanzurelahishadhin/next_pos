<?php

namespace App\Services;

use Spatie\Permission\Models\Role;

// Role Setup: list, create, update and delete roles
class RoleService
{
    // Roles with the filters of the list page; all of them when no per page is given (for the role dropdowns)
    public function getRoles(array $filters, $perPage, $columns = ['*'])
    {
        $query = Role::query()->select($columns);

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['guard_name'])) {
            $query->where('guard_name', 'like', '%' . $filters['guard_name'] . '%');
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }
        if (!empty($filters['updated_at'])) {
            $query->whereDate('updated_at', date('Y-m-d', strtotime($filters['updated_at'])));
        }

        $query->orderBy('id', 'desc');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    public function createRole(array $data)
    {
        // every role is for the web guard
        $data['guard_name'] = 'web';

        return Role::create($data);
    }

    public function updateRole(Role $role, array $data)
    {
        $role->update($data);
        return $role;
    }

    public function deleteRole(Role $role)
    {
        $role->delete();
    }

    // Names of the permissions this role has
    public function getPermissionNames(Role $role)
    {
        return $role->permissions->pluck('name');
    }

    // Give the role exactly these permissions (by name), the rest are taken away
    public function assignPermissions(Role $role, array $permissionNames)
    {
        $role->syncPermissions($permissionNames);
    }
}
