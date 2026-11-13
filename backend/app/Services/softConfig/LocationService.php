<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Location;
use App\Models\softConfig\Store;
use Illuminate\Support\Facades\Auth;

class LocationService
{
    // Location list with the search filters; paginated when perPage is given
    public function getLocations(array $filters = [], $perPage = null, $companyId = null, $storeId = null)
    {
        $query = Location::query()->select(
            'id',
            'name',
            'description',
            'company_id',
            'store_id',
            'code',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'deleted_at'
        );

        // a user of one company sees only its locations (Super Admin sees all)
        $userCompanyId = $this->ownCompanyId();
        if ($userCompanyId) {
            $query->where('company_id', $userCompanyId);
        }
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        // status "trash" shows only the deleted locations, a status filters by it,
        // no status shows all (deleted ones too)
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        } else {
            $query->withTrashed();
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['description'])) {
            $query->where('description', 'like', '%' . $filters['description'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the location
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['company_name'])) {
            $companyName = $filters['company_name'];
            $query->whereHas('company', function ($company) use ($companyName) {
                $company->where('name', 'like', '%' . $companyName . '%');
            });
        }
        if (!empty($filters['store_name'])) {
            $storeName = $filters['store_name'];
            $query->whereHas('store', function ($store) use ($storeName) {
                $store->where('name', 'like', '%' . $storeName . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }
        if (!empty($filters['search'])) {
            // one search box: name, code, description, company, store or maker
            $like = '%' . $filters['search'] . '%';
            $query->where(function ($search) use ($like) {
                $search->where('name', 'like', $like)
                    ->orWhere('code', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('company', function ($company) use ($like) {
                        $company->where('name', 'like', $like);
                    })
                    ->orWhereHas('store', function ($store) use ($like) {
                        $store->where('name', 'like', $like);
                    })
                    ->orWhereHas('createdBy', function ($user) use ($like) {
                        $user->where('name', 'like', $like);
                    });
            });
        }

        $query->with([
            'createdBy:id,name',
            'company:id,name',
            'store:id,name',
        ])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    public function createLocation(array $data)
    {
        $data['code'] = generateCode('LOC', 'locations', 'code');
        // a location belongs to the same company as its store
        $data['company_id'] = Store::find($data['store_id'])->company_id;
        return Location::create($data);
    }

    public function updateLocation(Location $location, array $data)
    {
        $data['company_id'] = Store::find($data['store_id'])->company_id;
        $location->update($data);
        return $location;
    }

    public function softDeleteLocation(Location $location)
    {
        $location->delete();
    }

    public function restoreLocation(Location $location)
    {
        if ($location->trashed()) {
            $location->restore();
        }
        return $location;
    }

    // only a location in the trash can be deleted for ever
    public function forceDeleteLocation(Location $location)
    {
        if ($location->trashed()) {
            $location->forceDelete();
            return true;
        }
        return false;
    }

    // company of the logged in user, null for Super Admin or a user without company
    private function ownCompanyId()
    {
        if (!Auth::check()) {
            return null;
        }
        $user = Auth::user();
        if ($user->hasRole('Super Admin') || empty($user->company_id)) {
            return null;
        }
        return $user->company_id;
    }
}
