<?php

namespace App\Models\authorization;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Permission;

class SubMenu extends Model
{
    protected $fillable = ['menu_id', 'name', 'slug'];

    // SubMenu belongs to a Menu
    public function menu()
    {
        return $this->belongsTo(Menu::class);
    }

    // Optional: get all permissions under this sub_menu
    public function permissions()
    {
        return $this->hasMany(Permission::class);
    }
}
