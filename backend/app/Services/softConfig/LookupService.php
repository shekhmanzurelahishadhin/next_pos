<?php


namespace App\Services\softConfig;


use App\Models\softConfig\Lookup;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class LookupService
{
    public function getLookups(array $filters = [], $perPage = null)
    {
        $query = Lookup::query()->select(
            'id',
            'name',
            'type',
            'code',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'deleted_at'
        );

        // Handle status / trash logic
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }
//        else {
//            $query->withTrashed();
//        }

        // Apply filters
        $query
            ->when($filters['name'] ?? null, fn($q, $name) =>
            $q->where('name', 'like', "%{$name}%")
            )
            ->when($filters['type'] ?? null, fn($q, $type) =>
            $q->where('type',  "{$type}")
            )
            ->when($filters['code'] ?? null, fn($q, $code) =>
            $q->where('code', 'like', "%{$code}%")
            )
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) =>
            $q->whereHas('createdBy', fn($sub) =>
            $sub->where('name', 'like', "%{$createdBy}%")
            )
            )
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) =>
            $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt)))
            );

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }


    public function store($request)
    {
        try {
            if ($request->is_new == 1) {
                if (Lookup::where('type', trim(str_replace(" ", "_", $request->type_write)))->exists()) {
                    return [
                        'success' => false,
                        'message' => 'Lookup Type Already Exist.',
                        'errors' => ['Lookup Type Already Exist.'],
                    ];
                } else {
                    $lookup = Lookup::insert([
                        'name' => trim($request->name),
                        'type' => trim(str_replace(" ", "_", $request->type_write)),
                        'code' => 1,
                        'created_by' => Auth::id(),
                        'created_at' => Carbon::now(),
                    ]);
                    return [
                        'success' => true,
                        'message' => 'Lookup saved Successfully.',
                        'data' => $lookup,
                    ];
                }
            }
            else {

                $lookup = Lookup::insert([
                    'name' => trim($request->name),
                    'type' => $request->type_select,
                    'code' => Lookup::where('type', $request->type_select)->max('code') + 1,
                    'created_by' => Auth::id(),
                    'created_at' => Carbon::now()
                ]);
                return [
                    'success' => true,
                    'message' => 'Lookup saved Successfully.',
                    'data' => $lookup,
                ];
            }
        }
        catch (\Exception $e){
            return [
                'success' => false,
                'message' => 'Lookup not Updated.',
                'error' => $e->getMessage(),
            ];
        }

    }

    public function update($request,$lookup)
    {
        try{
            $lookup = $lookup->update([
                'name' => $request->name,
                'status' => $request->status,
                'updated_by' => Auth::id(),
                'updated_at' => Carbon::now()
            ]);
            return [
                'success' => true,
                'message' => 'Lookup Updated Successfully.',
                'data' => $lookup,
            ];
        }
        catch (\Exception $e){
            return [
                'success' => false,
                'message' => 'Lookup not Updated.',
                'error' => $e->getMessage(),
            ];
        }
    }

    public function softDeleteLookup(Lookup $lookup)
    {
        $lookup->delete();
    }

    public function restoreLookup(Lookup $lookup)
    {
        if ($lookup->trashed()) {
            $lookup->restore();
        }
        return $lookup;
    }

    public function forceDeleteLookup(Lookup $lookup)
    {
        if ($lookup->trashed()) {
            // delete logo from storage

            $lookup->forceDelete();
            return true;
        }
        return false;
    }
}
