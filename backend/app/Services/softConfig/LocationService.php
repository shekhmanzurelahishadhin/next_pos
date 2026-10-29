<?php


namespace App\Services\softConfig;


use App\Models\softConfig\Location;
use App\Models\softConfig\Store;
use Illuminate\Support\Facades\Auth;

class LocationService
{

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
        // Restrict data if user is not superadmin and has a company_id
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('company_id', Auth::user()->company_id);
        }
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        // Handle status / trash logic
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        } else {
            $query->withTrashed();
        }

        // Apply filters
        $query
            ->when($filters['name'] ?? null, fn($q, $name) => $q->where('name', 'like', "%{$name}%"))
            ->when($filters['description'] ?? null, fn($q, $description) => $q->where('description', 'like', "%{$description}%"))
            ->when($filters['code'] ?? null, fn($q, $code) => $q->where('code', 'like', "%{$code}%"))
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")))
            ->when($filters['company_name'] ?? null, fn($q, $company) => $q->whereHas('company', fn($com) => $com->where('name', 'like', "%{$company}%")))
            ->when($filters['store_name'] ?? null, fn($q, $store) => $q->whereHas('store', fn($str) => $str->where('name', 'like', "%{$store}%")))
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt))))
            ->when($filters['search'] ?? null, fn($q, $term) => $q->where(function ($sub) use ($term) {
                $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhereHas('company', fn($company) => $company->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('store', fn($store) => $store->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('createdBy', fn($user) => $user->where('name', 'like', "%{$term}%"));
            })
            );

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
            'company:id,name',
            'store:id,name',
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }


    public function createLocation(array $data)
    {
        $data['code'] = generateCode('LOC', 'locations', 'code');
        // A location belongs to the same company as its store
        $data['company_id'] = Store::find($data['store_id'])->company_id;
        return Location::create($data);
    }

    public function updateLocation(Location $location, array $data)
    {
        $data['company_id'] = Store::find($data['store_id'])->company_id;
        $location->update($data); // updates the model
        return $location;         // return the model itself
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

    public function forceDeleteLocation(Location $location)
    {
        if ($location->trashed()) {
            $location->forceDelete();
            return true;
        }
        return false;
    }
}
