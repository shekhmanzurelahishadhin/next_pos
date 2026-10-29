<?php

namespace App\Http\Controllers\api\softConfig;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\location\CreateLocationRequest;
use App\Http\Requests\softConfig\location\UpdateLocationRequest;
use App\Http\Resources\softConfig\location\LocationResource;
use App\Models\softConfig\Location;
use App\Services\softConfig\LocationService;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class LocationController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:location.create|location.view|location.edit|location.delete')->only('index');
        $this->middleware('permission:location.create')->only('store');
        $this->middleware('permission:location.edit')->only('update');
        $this->middleware('permission:location.delete')->only('destroy');
    }
    public function index(Request $request, LocationService $locationService)
    {
        try {
            $perPage   = $request->get('per_page');
            $filters   = $request->only('search','status','name','company_name','store_name','code','description','created_at','created_by');
            $companyId = $request->query('company_id');
            $storeId   = $request->query('store_id');

            $locations = $locationService->getLocations($filters, $perPage, $companyId, $storeId);

            if ($locations instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'data'         => LocationResource::collection($locations->items()),
                    'total'        => $locations->total(),
                    'current_page' => $locations->currentPage(),
                    'per_page'     => $locations->perPage(),
                ];
            }else {
                // Collection response (no pagination)
                $data = [
                    'data' => LocationResource::collection($locations),
                    'total' => $locations->count(),
                    'current_page' => 1,
                    'per_page' => $locations->count(),
                ];
            }
                return ApiResponse::success($data, 'Location retrieve successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Location');
        }
    }

    /**
     * Location a newly created resource in storage.
     */
    public function store(CreateLocationRequest $request, LocationService $locationService)
    {
        try{
            $validatedData = $request->validated();

            $location  = $locationService->createLocation($validatedData);

            return ApiResponse::success(
                new LocationResource($location),
                'Location created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create Location');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $location  = Location::withTrashed()->findOrFail($id);

            return ApiResponse::success(
                new LocationResource($location),
                'Location retrieve successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Location');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateLocationRequest $request, LocationService $locationService, Location $location)
    {
        try {
            $location  = $locationService->updateLocation($location , $request->validated());

            return ApiResponse::success(
                new LocationResource($location),
                'Location updated successfully'
            );
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update Location');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash($id , LocationService $locationService)
    {
        try {
            $location = Location::findOrFail($id);
            $locationService->softDeleteLocation($location);

            return ApiResponse::success(null, 'Location moved to trash successfully');

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Location not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed  moved to trash Location');
        }
    }

    // Restore soft-deleted location
    public function restore($id, LocationService $locationService)
    {
        try {
            $location  = Location::withTrashed()->findOrFail($id);

            $location  = $locationService->restoreLocation($location);

            return ApiResponse::success(
                new LocationResource($location),
                'Location restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Location not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore Location');
        }
    }

    // Force delete permanently
    public function destroy($id, LocationService $locationService)
    {
        $location  = Location::withTrashed()->findOrFail($id);
        $deleted = $locationService->forceDeleteLocation($location);

        if ($deleted) {
            return response()->json([
                'message' => 'Location permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Location is not in trash',
        ], 400);
    }
}
