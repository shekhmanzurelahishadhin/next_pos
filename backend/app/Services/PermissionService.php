<?php

namespace App\Services;

use App\Models\authorization\Menu;
use App\Models\authorization\Module;
use App\Models\authorization\PermissionModel;
use App\Models\authorization\SubMenu;
use Spatie\Permission\Models\Permission;

// Permission Setup: list, create, update and delete permissions, and the module / menu / sub menu lists
class PermissionService
{
    // Permissions with their module, menu and sub menu, 30 per page when no per page is given
    public function getPermissions(array $filters, $perPage)
    {
        $query = PermissionModel::query();

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['module_name'])) {
            $moduleName = $filters['module_name'];
            $query->whereHas('module', function ($moduleQuery) use ($moduleName) {
                $moduleQuery->where('name', 'like', '%' . $moduleName . '%');
            });
        }
        if (!empty($filters['menu_name'])) {
            $menuName = $filters['menu_name'];
            $query->whereHas('menu', function ($menuQuery) use ($menuName) {
                $menuQuery->where('name', 'like', '%' . $menuName . '%');
            });
        }
        if (!empty($filters['sub_menu_name'])) {
            $subMenuName = $filters['sub_menu_name'];
            $query->whereHas('subMenu', function ($subMenuQuery) use ($subMenuName) {
                $subMenuQuery->where('name', 'like', '%' . $subMenuName . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }
        if (!empty($filters['updated_at'])) {
            $query->whereDate('updated_at', date('Y-m-d', strtotime($filters['updated_at'])));
        }

        $query->with(['module:id,name', 'menu:id,name', 'subMenu:id,name']);
        $query->orderBy('id', 'desc');

        if (!$perPage) {
            $perPage = 30;
        }
        return $query->paginate($perPage);
    }

    public function createPermission(array $data)
    {
        // every permission is for the web guard
        $data['guard_name'] = 'web';

        return Permission::create($data);
    }

    public function updatePermission(Permission $permission, array $data)
    {
        // the created date never changes
        unset($data['created_at']);

        $permission->update($data);
        return $permission;
    }

    public function deletePermission(Permission $permission)
    {
        $permission->delete();
    }

    public function getModules()
    {
        return Module::select('id', 'name')->get();
    }

    // Menus, only of one module when a module is given
    public function getMenus($moduleId)
    {
        $query = Menu::select('id', 'name', 'module_id');

        if ($moduleId) {
            $query->where('module_id', $moduleId);
        }

        return $query->get();
    }

    // Sub menus, only of one menu when a menu is given
    public function getSubMenus($menuId)
    {
        $query = SubMenu::select('id', 'name', 'menu_id');

        if ($menuId) {
            $query->where('menu_id', $menuId);
        }

        return $query->get();
    }
}
