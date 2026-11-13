<?php

namespace App\Services\softConfig;

use App\Models\softConfig\SubCategory;

class SubCategoryService
{
    // Sub category list with the search filters; paginated when perPage is given
    public function getSubCategories(array $filters = [], $perPage = null, $categoryId = null)
    {
        $query = SubCategory::query()->select(
            'id',
            'name',
            'category_id',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'deleted_at'
        );

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        // status "trash" shows the deleted sub categories, any other status filters by it
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the sub category
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['category_name'])) {
            $categoryName = $filters['category_name'];
            $query->whereHas('category', function ($category) use ($categoryName) {
                $category->where('name', 'like', '%' . $categoryName . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with([
            'createdBy:id,name',
            'category:id,name',
        ])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    public function createSubCategory(array $data)
    {
        return SubCategory::create($data);
    }

    public function updateSubCategory(SubCategory $subCategory, array $data)
    {
        $subCategory->update($data);
        return $subCategory;
    }

    public function softDeleteSubCategory(SubCategory $subCategory)
    {
        $subCategory->delete();
    }

    public function restoreSubCategory(SubCategory $subCategory)
    {
        if ($subCategory->trashed()) {
            $subCategory->restore();
        }
        return $subCategory;
    }

    // only a sub category in the trash can be deleted for ever
    public function forceDeleteSubCategory(SubCategory $subCategory)
    {
        if ($subCategory->trashed()) {
            $subCategory->forceDelete();
            return true;
        }
        return false;
    }
}
