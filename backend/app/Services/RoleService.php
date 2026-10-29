<?php


namespace App\Services;


use Spatie\Permission\Models\Role;

class RoleService
{
    public function getRoles($filters = [], $perPage, $columns = ['*'])
    {
        $query = Role::query()->select($columns);

        $query
            ->when($filters['name'] ?? null, fn($q, $name) => $q->where('name', 'like', "%{$name}%"))
            ->when($filters['guard_name'] ?? null, fn($q, $guard_name) => $q->where('guard_name', 'like', "%{$guard_name}%"))
            ->when($filters['created_at'] ?? null, fn($q, $created_at) => $q->whereDate('created_at', date('Y-m-d', strtotime($created_at))))
            ->when($filters['updated_at'] ?? null, fn($q, $updated_at) => $q->whereDate('updated_at', date('Y-m-d', strtotime($updated_at))));
        $query->orderBy('id', 'desc');

        // Return paginated if perPage is provided, else all
        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    public function createRole(array $data)
    {
        // Force guard_name to 'web' if not provided
        $data['guard_name'] = 'web';

        return Role::create($data);
    }

    public function updateRole($role, $data)
    {
        $role->update($data);
        return $role;
    }

    public function deleteRole($role)
    {
        return $role->delete();
    }
}
