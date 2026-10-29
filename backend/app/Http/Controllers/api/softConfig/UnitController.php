<?php

namespace App\Http\Controllers\api\softConfig;

use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\unit\CreateUnitRequest;
use App\Http\Requests\softConfig\unit\UpdateUnitRequest;
use App\Http\Resources\softConfig\unit\UnitResource;
use App\Models\softConfig\Unit;
use App\Services\softConfig\UnitService;
use Illuminate\Http\Request;
use App\Helpers\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class UnitController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:unit.create|unit.view|unit.edit|unit.delete')->only('index');
        $this->middleware('permission:unit.create')->only('store');
        $this->middleware('permission:unit.edit')->only('update');
        $this->middleware('permission:unit.delete')->only('destroy');
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, UnitService $unitService)
    {
        try{
            $perPage = $request->get('per_page');
            $filters = $request->only('search','status','name','code','created_at','created_by');
            $columns = $request->get('columns', UnitService::defaultColumns);

            $units = $unitService->getUnits($filters, $perPage, $columns);

            if ($units instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                $items = collect($units->items())->map(fn($unit) => new UnitResource((object) $unit, $columns));
                // Paginated response
                $data =[
                    'data'         => $items,
                    'total'        => $units->total(),
                    'current_page' => $units->currentPage(),
                    'per_page'     => $units->perPage(),
                ];
            }else{
                // Collection response (no pagination)
                $items = collect($units)->map(fn($unit) => new UnitResource((object) $unit, $columns));
                $data = [
                    'data'         => $items,
                    'total'        => $units->count(),
                    'current_page' => 1,
                    'per_page'     => $units->count(),
                ];
            }
            return ApiResponse::success($data, 'Unit retrieve successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Unit');
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateUnitRequest $request, UnitService $unitService)
    {
        try {
            $validatedData = $request->validated();

            $unit = $unitService->createUnit($validatedData);

            return ApiResponse::success(
                new UnitResource($unit),
                'Unit created successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create unit');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $unit = Unit::withTrashed()->findOrFail($id);

            return ApiResponse::success(
                new UnitResource($unit),
                'Unit retrieve successfully',
                201
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Unit');
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUnitRequest $request, UnitService $unitService, Unit $unit)
    {
        try {
            $unit = $unitService->updateUnit($unit, $request->validated());
            return ApiResponse::success(
                new UnitResource($unit),
                'Unit updated successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update Unit');
        }
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(Unit $unit, UnitService $unitService)
    {
        try {
            $unitService->softDeleteUnit($unit);

            return ApiResponse::success(
                null,
                'Unit moved to trash successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move Unit to trash');
        }
    }

    // Restore soft-deleted unit
    public function restore($id, UnitService $unitService)
    {
        try {
            $unit = Unit::withTrashed()->findOrFail($id);

            $unit = $unitService->restoreUnit($unit);

            return ApiResponse::success(
                new UnitResource($unit),
                'Unit restored successfully'
            );

        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Unit not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore Unit');
        }
    }

    // Force delete permanently
    public function destroy($id, UnitService $unitService)
    {
        $unit = Unit::withTrashed()->findOrFail($id);
        $deleted = $unitService->forceDeleteUnit($unit);

        if ($deleted) {
            return response()->json([
                'message' => 'Unit permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Unit is not in trash',
        ], 400);
    }
}
