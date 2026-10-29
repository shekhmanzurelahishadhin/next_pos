<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class LocalAdminSeeder extends Seeder
{
    /**
     * Seed a Super Admin login for local development only.
     */
    public function run(): void
    {
        $role = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

        $user = User::updateOrCreate(
            ['email' => 'admin@local.test'],
            [
                'name'     => 'Local Admin',
                'password' => Hash::make('password'),
            ]
        );

        $user->syncRoles([$role]);
    }
}
