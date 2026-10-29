<?php

namespace App\Models\authorization;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Permission;

class Module extends Model
{
    protected $fillable = ['name', 'slug'];

    // One module has many menus
    public function menus()
    {
        return $this->hasMany(Menu::class);
    }
    public function subMenus()
    {
        return $this->hasMany(SubMenu::class);
    }

    // Optional: get all permissions under this module
    public function permissions()
    {
        return $this->hasMany(Permission::class);
    }
}
