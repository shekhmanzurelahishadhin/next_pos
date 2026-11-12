<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;

// User Setup: list, create, update and delete users, and their own (direct) permissions
class UserService
{
    // Users with their roles and company, 30 per page when no per page is given
    public function getUsers(array $filters, $perPage)
    {
        $query = User::query();

        // a user of one company sees only the users of that company, Super Admin sees all
        $loggedInUser = Auth::user();
        if ($loggedInUser && !$loggedInUser->hasRole('Super Admin') && !empty($loggedInUser->company_id)) {
            $query->where('company_id', $loggedInUser->company_id);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['email'])) {
            $query->where('email', 'like', '%' . $filters['email'] . '%');
        }
        if (!empty($filters['roles_name'])) {
            $roleName = $filters['roles_name'];
            $query->whereHas('roles', function ($roleQuery) use ($roleName) {
                $roleQuery->where('name', 'like', '%' . $roleName . '%');
            });
        }
        if (!empty($filters['company'])) {
            $companyName = $filters['company'];
            $query->whereHas('company', function ($companyQuery) use ($companyName) {
                $companyQuery->where('name', 'like', '%' . $companyName . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }
        if (!empty($filters['updated_at'])) {
            $query->whereDate('updated_at', date('Y-m-d', strtotime($filters['updated_at'])));
        }

        $query->with(['roles:id,name', 'company:id,name']);
        $query->orderBy('id', 'desc');

        if (!$perPage) {
            $perPage = 30;
        }
        return $query->paginate($perPage);
    }

    public function createUser(array $data)
    {
        DB::beginTransaction();
        try {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'company_id' => $data['company_id'],
                'password' => Hash::make($data['password']),
            ]);

            if (!empty($data['roles'])) {
                $user->syncRoles($data['roles']);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return $user->load('roles');
    }

    public function updateUser(User $user, array $data)
    {
        DB::beginTransaction();
        try {
            $user->name = $data['name'];
            $user->email = $data['email'];
            $user->company_id = $data['company_id'];

            // the password changes only when a new one is typed
            if (!empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }

            $user->save();

            if (!empty($data['roles'])) {
                $user->syncRoles($data['roles']);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return $user->load('roles');
    }

    // Deletes the user with its roles and direct permissions
    public function deleteUser(User $user)
    {
        DB::beginTransaction();
        try {
            $user->syncRoles([]);
            $user->syncPermissions([]);
            $user->delete();

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Give the user exactly these direct permissions (by name), the rest are taken away
    public function assignPermissions(User $user, array $permissionNames)
    {
        $permissions = Permission::whereIn('name', $permissionNames)->get();
        $user->syncPermissions($permissions);
    }
}
