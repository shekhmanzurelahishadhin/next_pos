<?php

namespace App\Http\Controllers\api\softConfig;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\ppSpSetup\PpSpSetupRequest;
use App\Http\Resources\softConfig\ppSpSetup\PpSpSetupResource;
use App\Models\softConfig\PpSpSetup;
use App\Services\softConfig\PpSpSetupService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

class PpSpSetupController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:pp-sp-setup.create|pp-sp-setup.view|pp-sp-setup.edit|pp-sp-setup.delete')->only('index', 'show');
        $this->middleware('permission:pp-sp-setup.create')->only('store');
        $this->middleware('permission:pp-sp-setup.edit')->only('update');
        $this->middleware('permission:pp-sp-setup.delete')->only('trash', 'restore', 'destroy');
    }

    public function index(Request $request, PpSpSetupService $service)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('status', 'type', 'created_at', 'created_by');

            $setups = $service->getSetups($filters, $perPage);

            if ($setups instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                $data = [
                    'data'         => PpSpSetupResource::collection($setups->items()),
                    'total'        => $setups->total(),
                    'current_page' => $setups->currentPage(),
                    'per_page'     => $setups->perPage(),
                ];
            } else {
                $data = [
                    'data'         => PpSpSetupResource::collection($setups),
                    'total'        => $setups->count(),
                    'current_page' => 1,
                    'per_page'     => $setups->count(),
                ];
            }
            return ApiResponse::success($data, 'PP/SP setup retrieve successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve PP/SP setup');
        }
    }

    public function store(PpSpSetupRequest $request, PpSpSetupService $service)
    {
        try {
            $setup = $service->createSetup($request->validated());
            return ApiResponse::success(new PpSpSetupResource($setup), 'PP/SP setup created successfully', 201);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create PP/SP setup');
        }
    }

    public function show(string $id)
    {
        try {
            $setup = PpSpSetup::withTrashed()->findOrFail($id);
            return ApiResponse::success(new PpSpSetupResource($setup), 'PP/SP setup retrieve successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve PP/SP setup');
        }
    }

    public function update(PpSpSetupRequest $request, PpSpSetupService $service, PpSpSetup $ppSpSetup)
    {
        try {
            $setup = $service->updateSetup($ppSpSetup, $request->validated());
            return ApiResponse::success(new PpSpSetupResource($setup), 'PP/SP setup updated successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update PP/SP setup');
        }
    }

    public function trash($id, PpSpSetupService $service)
    {
        try {
            $service->softDeleteSetup(PpSpSetup::findOrFail($id));
            return ApiResponse::success(null, 'PP/SP setup moved to trash successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('PP/SP setup not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to move PP/SP setup to trash');
        }
    }

    public function restore($id, PpSpSetupService $service)
    {
        try {
            $setup = $service->restoreSetup(PpSpSetup::withTrashed()->findOrFail($id));
            return ApiResponse::success(new PpSpSetupResource($setup), 'PP/SP setup restored successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('PP/SP setup not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore PP/SP setup');
        }
    }

    public function destroy($id, PpSpSetupService $service)
    {
        $setup = PpSpSetup::withTrashed()->findOrFail($id);

        if ($service->forceDeleteSetup($setup)) {
            return response()->json(['message' => 'PP/SP setup permanently deleted']);
        }
        return response()->json(['message' => 'PP/SP setup is not in trash'], 400);
    }
}
