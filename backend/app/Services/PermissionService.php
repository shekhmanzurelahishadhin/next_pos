<?php


namespace App\Services;


use App\Models\authorization\PermissionModel;
use Spatie\Permission\Models\Permission;

class PermissionService
{
    public function getPermission(array $filters, $perPage = null)
    {
        $query = PermissionModel::query();

        $query
            ->when($filters['name'] ?? null, function ($q, $name) {
                return $q->where('name', 'like', "%{$name}%");
            })
            ->when($filters['module_name'] ?? null, function ($q, $moduleName) {
                return $q->whereHas('module', function ($m) use ($moduleName) {
                    $m->where('name', 'like', "%{$moduleName}%");
                });
            })
            ->when($filters['menu_name'] ?? null, function ($q, $menuName) {
                return $q->whereHas('menu', function ($m) use ($menuName) {
                    $m->where('name', 'like', "%{$menuName}%");
                });
            })
            ->when($filters['sub_menu_name'] ?? null, function ($q, $subMenuName) {
                return $q->whereHas('subMenu', function ($sm) use ($subMenuName) {
                    $sm->where('name', 'like', "%{$subMenuName}%");
                });
            })
            ->when($filters['created_at'] ?? null, function ($q, $date) {
                return $q->whereDate('created_at', date('Y-m-d', strtotime($date)));
            })
            ->when($filters['updated_at'] ?? null, function ($q, $date) {
                return $q->whereDate('updated_at', date('Y-m-d', strtotime($date)));
            });

        $query->with([
            'module:id,name',
            'menu:id,name',
            'subMenu:id,name'
        ])->orderBy('id', 'desc');

        $perPage = $perPage ?: 30;

        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    public function createPermission(array $data)
    {
        $data['guard_name'] = 'web';
        return Permission::create($data);
    }

    public function updatePermission($permission, $data)
    {

        $data = collect($data)->except(['created_at'])->toArray();

        $permission->update($data);

        return $permission;
    }
    public function deletePermission($permission)
    {
        return $permission->delete();
    }
}
