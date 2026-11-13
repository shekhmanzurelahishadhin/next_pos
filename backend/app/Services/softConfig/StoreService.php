<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Store;
use Illuminate\Support\Facades\Auth;

class StoreService
{
    // Store list with the search filters; paginated when perPage is given
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

        // a user of one company sees only its stores (Super Admin sees all)
        $userCompanyId = $this->ownCompanyId();
        if ($userCompanyId) {
            $query->where('company_id', $userCompanyId);
        }
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        // status "trash" shows the deleted stores, any other status filters by it
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['address'])) {
            $query->where('address', 'like', '%' . $filters['address'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the store
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
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with([
            'createdBy:id,name',
            'company:id,name'
        ])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    public function createStore(array $data)
    {
        $data['code'] = generateCode('STR', 'stores', 'code');
        return Store::create($data);
    }

    public function updateStore(Store $store, array $data)
    {
        $store->update($data);
        return $store;
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

    // only a store in the trash can be deleted for ever
    public function forceDeleteStore(Store $store)
    {
        if ($store->trashed()) {
            $store->forceDelete();
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
