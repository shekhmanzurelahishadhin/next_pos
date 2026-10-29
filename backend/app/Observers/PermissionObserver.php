<?php

namespace App\Observers;

use Spatie\Permission\Models\Permission;

class PermissionObserver
{
    public function created(Permission $permission)
    {
        $this->clearPermissionCache();
    }

    public function updated(Permission $permission)
    {
        $this->clearPermissionCache();
    }

    public function deleted(Permission $permission)
    {
        $this->clearPermissionCache();
    }

    public function restored(Permission $permission)
    {
        $this->clearPermissionCache();
    }

    public function forceDeleted(Permission $permission)
    {
        $this->clearPermissionCache();
    }

    // ADD THIS MISSING METHOD
    protected function clearPermissionCache()
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
