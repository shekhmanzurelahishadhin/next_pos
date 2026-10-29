<?php


namespace App\Services\softConfig;


use App\Models\softConfig\ProductModel;

class ModelService
{
    public function getModels(array $filters = [], $perPage = null, $categoryId = null, $subCategoryId = null, $brandId = null)
    {
        $query = ProductModel::query()->select(
            'id',
            'name',
            'brand_id',
            'category_id',
            'sub_category_id',
            'status',
            'created_by',
            'created_at',
            'deleted_at'
        );

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }
        if ($subCategoryId) {
            $query->where('sub_category_id', $subCategoryId);
        }
        if ($brandId) {
            $query->where('brand_id', $brandId);
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
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")))
            ->when($filters['category_name'] ?? null, fn($q, $category) => $q->whereHas('category', fn($cat) => $cat->where('name', 'like', "%{$category}%")))
            ->when($filters['sub_category_name'] ?? null, fn($q, $sub_category) => $q->whereHas('subCategory', fn($subCat) => $subCat->where('name', 'like', "%{$sub_category}%")))
            ->when($filters['brand_name'] ?? null, fn($q, $brand) => $q->whereHas('brand', fn($str) => $str->where('name', 'like', "%{$brand}%")))
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt))))
            ->when($filters['search'] ?? null, fn($q, $term) => $q->where(function ($sub) use ($term) {
                $sub->where('name', 'like', "%{$term}%")
                    ->orWhereHas('category', fn($category) => $category->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('subCategory', fn($sub_category) => $sub_category->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('brand', fn($brand) => $brand->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('createdBy', fn($user) => $user->where('name', 'like', "%{$term}%"));
            })
            );

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
            'category:id,name',
            'subCategory:id,name',
            'brand:id,name',
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    public function createModel(array $data)
    {
        return ProductModel::create($data);
    }

    public function updateModel(ProductModel $product_model, array $data)
    {
        $product_model->update($data); // updates the model
        return $product_model;         // return the model itself
    }


    public function softDeleteModel(ProductModel $product_model)
    {
        $product_model->delete();
    }

    public function restoreModel(ProductModel $product_model)
    {
        if ($product_model->trashed()) {
            $product_model->restore();
        }
        return $product_model;
    }

    public function forceDeleteModel(ProductModel $product_model)
    {
        if ($product_model->trashed()) {
            $product_model->forceDelete();
            return true;
        }
        return false;
    }
}
