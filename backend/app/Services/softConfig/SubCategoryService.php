<?php


namespace App\Services\softConfig;


use App\Models\softConfig\SubCategory;
use Illuminate\Support\Facades\Auth;

class SubCategoryService
{
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
            ->when($filters['name'] ?? null, fn($q, $name) => $q->where('name', 'like', "%{$name}%"))
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")))
            ->when($filters['category_name'] ?? null, fn($q, $category) => $q->whereHas('category', fn($cat) => $cat->where('name', 'like', "%{$category}%")))
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt))));

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
            'category:id,name',
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }


    public function createSubCategory(array $data)
    {
        return SubCategory::create($data);
    }

    public function updateSubCategory(SubCategory $subCategory, array $data)
    {
        $subCategory->update($data); // updates the model
        return $subCategory;         // return the model itself
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

    public function forceDeleteSubCategory(SubCategory $subCategory)
    {
        if ($subCategory->trashed()) {
            $subCategory->forceDelete();
            return true;
        }
        return false;
    }
}
