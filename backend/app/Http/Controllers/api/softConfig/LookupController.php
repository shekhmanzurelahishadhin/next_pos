<?php

namespace App\Http\Controllers\api\softConfig;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\lookup\StoreLookupRequest;
use App\Http\Requests\softConfig\lookup\UpdateLookupRequest;
use App\Http\Resources\softConfig\lookup\LookupResource;
use App\Models\softConfig\Lookup;
use App\Services\softConfig\LookupService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LookupController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:lookup.create|lookup.view|lookup.edit|lookup.delete')->only('index');
        $this->middleware('permission:lookup.create')->only('store');
        $this->middleware('permission:lookup.edit')->only('update');
        $this->middleware('permission:lookup.delete')->only('destroy');
    }

    public function index(Request $request, LookupService $lookupService)
    {
        try {
            $perPage = $request->get('per_page'); // can be null
            $filters = $request->only('status', 'name', 'type', 'code', 'created_by', 'created_at','updated_at');

            $lookups = $lookupService->getLookups($filters, $perPage);

            if ($lookups instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                // Paginated response
                $data = [
                    'data' => LookupResource::collection($lookups->items()),
                    'total' => $lookups->total(),
                    'current_page' => $lookups->currentPage(),
                    'per_page' => $lookups->perPage(),
                ];
            } else {
                // Collection response (no pagination)
                $data = [
                    'data' => LookupResource::collection($lookups),
                    'total' => $lookups->count(),
                    'current_page' => 1,
                    'per_page' => $lookups->count(),
                ];
            }
            return ApiResponse::success($data, 'Brand retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve Brand');
        }
    }

    public function store(StoreLookupRequest $request, LookupService $lookupService)
    {
        return $lookupService->store($request);
    }

    public function update(UpdateLookupRequest $request, Lookup $lookup, LookupService $lookupService)
    {
        return $lookupService->update($request, $lookup);
    }
    // Soft delete (move to trash)
    public function trash(Lookup $lookup, LookupService $lookupService)
    {
        $lookupService->softDeleteLookup($lookup);

        return response()->json([
            'message' => 'Lookup moved to trash successfully',
        ]);
    }

    // Restore soft-deleted Lookup
    public function restore($id, LookupService $lookupService)
    {
        $lookup = Lookup::withTrashed()->findOrFail($id);

        $lookup = $lookupService->restoreLookup($lookup);

        return response()->json([
            'message' => 'Lookup restored successfully',
            'data' => $lookup,
        ]);
    }

    // Force delete permanently
    public function destroy($id, LookupService $lookupService)
    {
        $lookup = Lookup::withTrashed()->findOrFail($id);
        $deleted = $lookupService->forceDeleteLookup($lookup);

        if ($deleted) {
            return response()->json([
                'message' => 'Lookup permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Lookup is not in trash',
        ], 400);
    }

    public function getLookupTypeLists()
    {
        $types = Lookup::groupBy('type')->pluck('type')->map(fn($type) => [
            'value' => $type,
            'label' => $type,
        ]);

        return response()->json($types);
    }

    public function getLookupListByType($type)
    {

        $values = Lookup::where('type', $type)->where('status', 1)->get()->map(fn($value) => [
            'value' => $value->code,
            'label' => $value->name,
        ]);

        return response()->json($values);

    }

    public function getLookupNameByCode($type, $code)
    {

        $value = Lookup::where('type', $type)->where('code', $code)->first();
        if ($value) {
            return $value->name;
        } else {
            return 'Not Defined';
        }
    }
}
