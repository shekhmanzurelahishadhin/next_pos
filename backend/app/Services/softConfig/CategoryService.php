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

    // Category list with the search filters; paginated when perPage is given
    public function getCategories(array $filters = [], $perPage = null, $columns = self::defaultColumns)
    {
        $query = Category::query()->select($columns);

        // status "trash" shows the deleted categories, any other status filters by it
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['slug'])) {
            $query->where('slug', 'like', '%' . $filters['slug'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the category
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with([
            'createdBy:id,name',
            'productModels:id,name,category_id',
            'subCategories:id,name,category_id'
        ])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    public function createCategory(array $data)
    {
        return Category::create($data);
    }

    public function updateCategory(Category $category, array $data)
    {
        $category->update($data);
        return $category;
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

    // only a category in the trash can be deleted for ever
    public function forceDeleteCategory(Category $category)
    {
        if ($category->trashed()) {
            $category->forceDelete();
            return true;
        }
        return false;
    }
}
