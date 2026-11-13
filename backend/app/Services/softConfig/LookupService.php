<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Lookup;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class LookupService
{
    // Lookup list with the search filters; paginated when perPage is given
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

        // status "trash" shows the deleted lookups, any other status filters by it
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the lookup
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with(['createdBy:id,name'])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    // is_new = 1: a new type written by the user (its first code is 1),
    // else a new name for a type that is already there (next code of that type)
    public function store($request)
    {
        try {
            if ($request->is_new == 1) {
                $type = trim(str_replace(" ", "_", $request->type_write));
                if (Lookup::where('type', $type)->exists()) {
                    return [
                        'success' => false,
                        'message' => 'Lookup Type Already Exist.',
                        'errors' => ['Lookup Type Already Exist.'],
                    ];
                }
                $code = 1;
            } else {
                $type = $request->type_select;
                $code = Lookup::where('type', $type)->max('code') + 1;
            }

            $lookup = Lookup::insert([
                'name' => trim($request->name),
                'type' => $type,
                'code' => $code,
                'created_by' => Auth::id(),
                'created_at' => Carbon::now(),
            ]);

            return [
                'success' => true,
                'message' => 'Lookup saved Successfully.',
                'data' => $lookup,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Lookup not Updated.',
                'error' => $e->getMessage(),
            ];
        }
    }

    public function update($request, $lookup)
    {
        try {
            $updated = $lookup->update([
                'name' => $request->name,
                'status' => $request->status,
                'updated_by' => Auth::id(),
                'updated_at' => Carbon::now()
            ]);

            return [
                'success' => true,
                'message' => 'Lookup Updated Successfully.',
                'data' => $updated,
            ];
        } catch (\Exception $e) {
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

    // only a lookup in the trash can be deleted for ever
    public function forceDeleteLookup(Lookup $lookup)
    {
        if ($lookup->trashed()) {
            $lookup->forceDelete();
            return true;
        }
        return false;
    }
}
