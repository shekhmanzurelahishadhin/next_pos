<?php

namespace App\Observers;

use Spatie\Permission\Models\Role;

class RoleObserver
{
    public function created(Role $role)
    {
        $this->clearPermissionCache();
    }

    public function updated(Role $role)
    {
        $this->clearPermissionCache();
    }

    public function deleted(Role $role)
    {
        $this->clearPermissionCache();
    }

    public function restored(Role $role)
    {
        $this->clearPermissionCache();
    }

    public function forceDeleted(Role $role)
    {
        $this->clearPermissionCache();
    }

    // ADD THIS MISSING METHOD
    protected function clearPermissionCache()
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
