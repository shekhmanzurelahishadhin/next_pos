<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Product;

class ProductService
{
    // Product list with the search filters; paginated when perPage is given
    public function getProducts(array $filters = [], $perPage = null, $categoryId = null, $subCategoryId = null, $brandId = null)
    {
        $query = Product::query()->select(
            'id',
            'name',
            'part_number',
            'brand_id',
            'product_category_id',
            'sub_category_id',
            'unit_id',
            'alert_qty',
            'short_list_qty',
            'unit_weight',
            'model',
            'model_year',
            'engine',
            'chassis',
            'vehicle_brand_id',
            'country_id',
            'min_order_qty',
            'manufacturer_id',
            'color_id',
            'size_id',
            'warranty',
            'features',
            'supported_models',
            'year_models',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'deleted_at'
        );

        if ($categoryId) {
            $query->where('product_category_id', $categoryId);
        }
        if ($subCategoryId) {
            $query->where('sub_category_id', $subCategoryId);
        }
        if ($brandId) {
            $query->where('brand_id', $brandId);
        }

        // status "trash" shows only the deleted products, a status filters by it,
        // no status shows all (deleted ones too)
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        } else {
            $query->withTrashed();
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['part_number'])) {
            $query->where('part_number', 'like', '%' . $filters['part_number'] . '%');
        }
        if (!empty($filters['unit_id'])) {
            $query->where('unit_id', $filters['unit_id']);
        }
        if (!empty($filters['alert_qty'])) {
            $query->where('alert_qty', $filters['alert_qty']);
        }
        if (!empty($filters['model'])) {
            // the own model or one of the supported models
            $model = '%' . $filters['model'] . '%';
            $query->where(function ($models) use ($model) {
                $models->where('model', 'like', $model)->orWhere('supported_models', 'like', $model);
            });
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the product
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
        if (!empty($filters['sub_category_name'])) {
            $subCategoryName = $filters['sub_category_name'];
            $query->whereHas('subCategory', function ($subCategory) use ($subCategoryName) {
                $subCategory->where('name', 'like', '%' . $subCategoryName . '%');
            });
        }
        if (!empty($filters['brand_name'])) {
            $brandName = $filters['brand_name'];
            $query->whereHas('brand', function ($brand) use ($brandName) {
                $brand->where('name', 'like', '%' . $brandName . '%');
            });
        }
        if (!empty($filters['search'])) {
            // one search box: name, part number, models, category, brand or maker
            $like = '%' . $filters['search'] . '%';
            $query->where(function ($search) use ($like) {
                $search->where('name', 'like', $like)
                    ->orWhere('part_number', 'like', $like)
                    ->orWhere('model', 'like', $like)
                    ->orWhere('supported_models', 'like', $like)
                    ->orWhereHas('category', function ($category) use ($like) {
                        $category->where('name', 'like', $like);
                    })
                    ->orWhereHas('brand', function ($brand) use ($like) {
                        $brand->where('name', 'like', $like);
                    })
                    ->orWhereHas('createdBy', function ($user) use ($like) {
                        $user->where('name', 'like', $like);
                    });
            });
        }

        $query->with([
            'createdBy:id,name',
            'category:id,name',
            'subCategory:id,name',
            'brand:id,name',
            'unit:id,name',
            'vehicleBrand:id,name',
            'country:id,name',
            'manufacturer:id,name',
            'color:id,name',
            'size:id,name',
        ])
            // same category / sub-category rows next to each other, so the table can merge them
            ->orderBy('product_category_id')
            ->orderBy('sub_category_id')
            ->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    // Every vehicle model name used by products (model + comma separated supported models)
    public function getModelList(): array
    {
        // one name per model, the same name in other case only once
        $names = [];
        foreach (Product::query()->select('model', 'supported_models')->get() as $product) {
            $productNames = explode(',', (string) $product->supported_models);
            array_unshift($productNames, $product->model);

            foreach ($productNames as $name) {
                $name = trim((string) $name);
                // skip empty names (and "0", as before)
                if (!$name) {
                    continue;
                }
                $lowerName = strtolower($name);
                if (!isset($names[$lowerName])) {
                    $names[$lowerName] = $name;
                }
            }
        }

        $list = array_values($names);
        sort($list, SORT_NATURAL | SORT_FLAG_CASE);
        return $list;
    }

    public function createProduct(array $data)
    {
        return Product::create($data);
    }

    public function updateProduct(Product $product, array $data)
    {
        $product->update($data);
        return $product;
    }

    public function softDeleteProduct(Product $product)
    {
        return $product->delete();
    }

    public function restoreProduct(Product $product)
    {
        if ($product->trashed()) {
            $product->restore();
        }
        return $product;
    }

    // only a product in the trash can be deleted for ever
    public function forceDeleteProduct(Product $product)
    {
        if ($product->trashed()) {
            $product->forceDelete();
            return true;
        }
        return false;
    }
}
