<?php


namespace App\Services\softConfig;


use App\Models\softConfig\Store;
use Illuminate\Support\Facades\Auth;

class StoreService
{
    public function getStores(array $filters = [], $perPage = null, $companyId = null)
    {
        $query = Store::query()->select(
            'id',
            'name',
            'address',
            'company_id',
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
            ->when($filters['name'] ?? null, fn($q, $name) => $q->where('name', 'like', "%{$name}%")
            )
            ->when($filters['address'] ?? null, fn($q, $address) => $q->where('address', 'like', "%{$address}%")
            )
            ->when($filters['code'] ?? null, fn($q, $code) => $q->where('code', 'like', "%{$code}%")
            )
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")
            )
            )
            ->when($filters['company_name'] ?? null, fn($q, $company) => $q->whereHas('company', fn($com) => $com->where('name', 'like', "%{$company}%")
            )
            )
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt)))
            );

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
            'company:id,name'
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }


    public function createStore(array $data)
    {
        $data['code'] = generateCode('STR', 'stores', 'code');
        return Store::create($data);
    }

    public function updateStore(Store $store, array $data)
    {
        $store->update($data); // updates the model
        return $store;         // return the model itself
    }

    public function softDeleteStore(Store $store)
    {
        $store->delete();
    }

    public function restoreStore(Store $store)
    {
        if ($store->trashed()) {
            $store->restore();
        }
        return $store;
    }

    public function forceDeleteStore(Store $store)
    {
        if ($store->trashed()) {
            $store->forceDelete();
            return true;
        }
        return false;
    }
}
