<?php


namespace App\Services\softConfig;


use App\Models\softConfig\Category;

class CategoryService
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
    public function getCategories(array $filters = [], $perPage = null, $columns = self::defaultColumns)
    {
        $query = Category::query()->select($columns);

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
            ->when($filters['slug'] ?? null, fn($q, $slug) =>
            $q->where('slug', 'like', "%{$slug}%")
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
            'productModels:id,name,category_id',
            'subCategories:id,name,category_id'
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }



    public function createCategory(array $data)
    {
        return Category::create($data);
    }

    public function updateCategory(Category $category, array $data)
    {
        $category->update($data); // updates the model
        return $category;         // return the model itself
    }


    public function softDeleteCategory(Category $category)
    {
        $category->delete();
    }

    public function restoreCategory(Category $category)
    {
        if ($category->trashed()) {
            $category->restore();
        }
        return $category;
    }

    public function forceDeleteCategory(Category $category)
    {
        if ($category->trashed()) {
            $category->forceDelete();
            return true;
        }
        return false;
    }
}
