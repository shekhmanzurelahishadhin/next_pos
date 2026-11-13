<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Brand;

class BrandService
{
    const defaultColumns = [
        'id',
        'name',
        'slug',
        'status',
        'created_by',
        'created_at',
        'deleted_at',
        'updated_at'
    ];

    // Brand list with the search filters; paginated when perPage is given
    public function getBrands(array $filters = [], $perPage = null, $columns = self::defaultColumns)
    {
        $query = Brand::query()->select($columns);

        // status "trash" shows the deleted brands, any other status filters by it
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the brand
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

    public function createBrand(array $data)
    {
        return Brand::create($data);
    }

    public function updateBrand(Brand $brand, array $data)
    {
        $brand->update($data);
        return $brand;
    }

    public function softDeleteBrand(Brand $brand)
    {
        $brand->delete();
    }

    public function restoreBrand(Brand $brand)
    {
        if ($brand->trashed()) {
            $brand->restore();
        }
        return $brand;
    }

    // only a brand in the trash can be deleted for ever
    public function forceDeleteBrand(Brand $brand)
    {
        if ($brand->trashed()) {
            $brand->forceDelete();
            return true;
        }
        return false;
    }
}
