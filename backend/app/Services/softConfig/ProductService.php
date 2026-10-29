<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Product;

class ProductService
{
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

        // Direct filters
        if ($categoryId) {
            $query->where('product_category_id', $categoryId);
        }

        if ($subCategoryId) {
            $query->where('sub_category_id', $subCategoryId);
        }

        if ($brandId) {
            $query->where('brand_id', $brandId);
        }

        // Trash / status handling
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        } else {
            $query->withTrashed();
        }

        // Dynamic filters
        $query
            ->when($filters['name'] ?? null, fn($q, $v) =>
            $q->where('name', 'like', "%{$v}%")
            )
            ->when($filters['part_number'] ?? null, fn($q, $v) =>
            $q->where('part_number', 'like', "%{$v}%")
            )
            ->when($filters['unit_id'] ?? null, fn($q, $v) =>
            $q->where('unit_id', $v)
            )
            ->when($filters['alert_qty'] ?? null, fn($q, $v) =>
            $q->where('alert_qty', $v)
            )
            ->when($filters['model'] ?? null, fn($q, $v) =>
            $q->where(fn($m) => $m->where('model', 'like', "%{$v}%")->orWhere('supported_models', 'like', "%{$v}%"))
            )
            ->when($filters['created_by'] ?? null, fn($q, $v) =>
            $q->whereHas('createdBy', fn($u) =>
            $u->where('name', 'like', "%{$v}%")
            )
            )
            ->when($filters['category_name'] ?? null, fn($q, $v) =>
            $q->whereHas('category', fn($c) =>
            $c->where('name', 'like', "%{$v}%")
            )
            )
            ->when($filters['sub_category_name'] ?? null, fn($q, $v) =>
            $q->whereHas('subCategory', fn($s) =>
            $s->where('name', 'like', "%{$v}%")
            )
            )
            ->when($filters['brand_name'] ?? null, fn($q, $v) =>
            $q->whereHas('brand', fn($b) =>
            $b->where('name', 'like', "%{$v}%")
            )
            )
            ->when($filters['search'] ?? null, fn($q, $term) =>
            $q->where(function ($sub) use ($term) {
                $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('part_number', 'like', "%{$term}%")
                    ->orWhere('model', 'like', "%{$term}%")
                    ->orWhere('supported_models', 'like', "%{$term}%")
                    ->orWhereHas('category', fn($c) => $c->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('brand', fn($b) => $b->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('createdBy', fn($u) => $u->where('name', 'like', "%{$term}%"));
            })
            );

        // Eager loading
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

        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    // Every vehicle model name used by products (model + comma separated supported models)
    public function getModelList(): array
    {
        return Product::query()
            ->select('model', 'supported_models')
            ->get()
            ->flatMap(fn($p) => array_merge([$p->model], explode(',', (string) $p->supported_models)))
            ->map(fn($name) => trim((string) $name))
            ->filter()
            ->unique(fn($name) => strtolower($name))
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
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

    public function forceDeleteProduct(Product $product)
    {
        if ($product->trashed()) {
            $product->forceDelete();
            return true;
        }
        return false;
    }
}
