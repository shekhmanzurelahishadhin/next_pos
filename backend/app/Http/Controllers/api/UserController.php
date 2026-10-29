<?php

namespace App\Http\Controllers\api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\users\StoreUserRequest;
use App\Http\Requests\users\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:user.create|user.view|user.edit|user.delete')->only('index');
        $this->middleware('permission:user.create')->only('store');
        $this->middleware('permission:user.edit')->only('update');
        $this->middleware('permission:user.delete')->only('destroy');
    }
    public function user(Request $request)
    {
        $user = Auth::user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'company_id' => $user->company_id,
            ],
            'roles' => $user->getRoleNames(), // returns array of role names
            'permissions' => $user->getAllPermissions()->pluck('name'), // returns array of permission names
        ]);
    }

    public function index(Request $request, UserService $userService)
    {

        try {
            $perPage = $request->get('per_page'); // can be null
            $filters = $request->only('name','email','company','roles_name','created_at','updated_at');

            $users = $userService->getUsers($filters, $perPage);

            if ($users instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'items' => UserResource::collection($users->items()),
                    'total' => $users->total(),
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                ];
            }else {
                // Collection response (no pagination)
                $data = [
                    'items' => UserResource::collection($users),
                    'total' => $users->count(),
                    'current_page' => 1,
                    'per_page' => $users->count(),
                ];
            }

            return ApiResponse::success($data, 'Users retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve user'.$e);
        }
    }


    public function store(StoreUserRequest $request, UserService $userService)
    {
        $result = $userService->store($request->validated());

        if ($result['success']) {
            return response()->json([
                'message' => 'User created successfully',
                'data'    => new UserResource($result['user']),
            ], 201);
        }

        return response()->json([
            'message' => $result['message'],
            'error'   => $result['error'], // optional
        ], 500);
    }

    public function update(UpdateUserRequest $request, UserService $userService, User $user)
    {
        $result = $userService->update($user, $request->validated());

        if ($result['success']) {
            return response()->json([
                'message' => 'User updated successfully',
                'data'    => new UserResource($result['user']),
            ]);
        }

        return response()->json([
            'message' => $result['message'],
            'error'   => $result['error'] ?? null,
        ], 500);
    }


    public function getUserPermissions(User $user)
    {
        // Return user with their direct permissions
        return response()->json([
            'user' => $user,
            'permissions' => $user->getDirectPermissions()->pluck('name')
        ]);
    }
    public function destroy(User $user, UserService $userService)
    {
        $result = $userService->delete($user);

        if ($result['success']) {
            return response()->json([
                'message' => 'User deleted successfully',
            ]);
        }

        return response()->json([
            'message' => $result['message'],
            'error' => $result['error'] ?? null,
        ], 500);
    }

    /**
     * Assign direct permissions to user
     */
    public function assignPermissions(Request $request, User $user)
    {

        try {
            // Get permission models from permission names
            $permissions = Permission::whereIn('name', $request->permissions)->get();

            // Sync permissions - this automatically handles revoking and granting
            $user->syncPermissions($permissions);

            return response()->json([
                'message' => 'Permissions synchronized successfully',
                'user' => $user->only(['id', 'name', 'email']),
                'permissions' => $user->getDirectPermissions()->pluck('name')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to assign permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
