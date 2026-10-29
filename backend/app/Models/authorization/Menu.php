<?php

namespace App\Models\authorization;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Permission;

class Menu extends Model
{
    protected $fillable = ['module_id', 'name', 'slug'];

    // Menu belongs to a Module
    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    // Menu has many sub_menus
    public function subMenus()
    {
        return $this->hasMany(SubMenu::class);
    }

    // Optional: get all permissions under this menu
    public function permissions()
    {
        return $this->hasMany(Permission::class);
    }
}
