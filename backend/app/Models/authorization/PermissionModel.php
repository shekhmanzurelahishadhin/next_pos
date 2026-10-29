<?php

namespace App\Models\authorization;

use Spatie\Permission\Contracts\Permission as PermissionContract;
use Spatie\Permission\Guard;
use Spatie\Permission\Models\Permission;

class PermissionModel extends Permission
{
    //
    public static function findOrCreate(string $name, ?string $guardName = null): PermissionContract
    {
        $guardName = $guardName ?? Guard::getDefaultName(static::class);
        $permission = static::getPermission(['name' => $name, 'guard_name' => $guardName]);

        if (! $permission) {
            return static::query()->create(['name' => $name, 'guard_name' => $guardName]);
        }

        return $permission;
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    public function menu()
    {
        return $this->belongsTo(Menu::class);
    }

    public function subMenu()
    {
        return $this->belongsTo(SubMenu::class);
    }
}
