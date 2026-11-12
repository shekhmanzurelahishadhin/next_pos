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

// User Setup, the logged in user, and the direct permissions of a user
class UserController extends Controller
{
    public function __construct(private UserService $service)
    {
        $this->middleware('permission:user.create|user.view|user.edit|user.delete')->only('index');
        $this->middleware('permission:user.create')->only('store');
        $this->middleware('permission:user.edit')->only('update');
        $this->middleware('permission:user.delete')->only('destroy');
    }

    // The logged in user with all its role and permission names, for the menus and buttons
    public function user()
    {
        $user = Auth::user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'company_id' => $user->company_id,
            ],
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    public function index(Request $request)
    {
        try {
            $filters = $request->only('name', 'email', 'company', 'roles_name', 'created_at', 'updated_at');
            $users = $this->service->getUsers($filters, $request->get('per_page'));

            $data = [
                'items' => UserResource::collection($users->items()),
                'total' => $users->total(),
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
            ];

            return ApiResponse::success($data, 'Users retrieved successfully');
        } catch (\Exception $e) {
            report($e);
            return ApiResponse::serverError('Failed to retrieve user');
        }
    }

    public function store(StoreUserRequest $request)
    {
        try {
            $user = $this->service->createUser($request->validated());

            return response()->json([
                'message' => 'User created successfully',
                'data' => new UserResource($user),
            ], 201);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['message' => 'Failed to create user'], 500);
        }
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        try {
            $user = $this->service->updateUser($user, $request->validated());

            return response()->json([
                'message' => 'User updated successfully',
                'data' => new UserResource($user),
            ]);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['message' => 'Failed to update user'], 500);
        }
    }

    public function destroy(User $user)
    {
        try {
            $this->service->deleteUser($user);
            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['message' => 'Failed to delete user'], 500);
        }
    }

    // The user with the names of its direct permissions, for the User Permissions page
    public function getUserPermissions(User $user)
    {
        return response()->json([
            'user' => $user,
            'permissions' => $user->getDirectPermissions()->pluck('name'),
        ]);
    }

    public function assignPermissions(Request $request, User $user)
    {
        try {
            $this->service->assignPermissions($user, $request->input('permissions', []));

            return response()->json([
                'message' => 'Permissions synchronized successfully',
                'user' => $user->only(['id', 'name', 'email']),
                'permissions' => $user->getDirectPermissions()->pluck('name'),
            ]);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['message' => 'Failed to assign permissions'], 500);
        }
    }
}
