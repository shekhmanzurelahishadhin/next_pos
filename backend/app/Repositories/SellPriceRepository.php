<?php

namespace App\Repositories;

use App\Models\sales\SellPrice;
use App\Repositories\Interfaces\SellPriceRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class SellPriceRepository implements SellPriceRepositoryInterface
{
    protected $model;

    public function __construct(SellPrice $model)
    {
        $this->model = $model;
    }

    public function getAll(array $filters = []): Collection
    {
        $query = $this->model->with(['product', 'createdBy']);
        return $this->applyFilters($query, $filters)->get();
    }

    public function getPaginated(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = $this->model->with(['product', 'createdBy']);
        return $this->applyFilters($query, $filters)->paginate($perPage);
    }

    public function findById(int $id): ?SellPrice
    {
        return $this->model->with(['product', 'createdBy', 'updatedBy'])->find($id);
    }

    public function create(array $data): SellPrice
    {
        return $this->model->create($data);
    }

    public function update(int $id, array $data): SellPrice
    {
        $sellPrice = $this->model->findOrFail($id);
        $sellPrice->update($data);
        return $sellPrice->fresh();
    }

    public function delete(int $id): bool
    {
        $sellPrice = $this->model->findOrFail($id);
        return $sellPrice->delete();
    }

    public function restore(int $id): bool
    {
        $sellPrice = $this->model->withTrashed()->findOrFail($id);
        return $sellPrice->restore();
    }

    public function forceDelete(int $id): bool
    {
        $sellPrice = $this->model->withTrashed()->findOrFail($id);
        return $sellPrice->forceDelete();
    }

    public function getActivePricesForProduct(int $productId): Collection
    {
        return $this->model
            ->where('product_id', $productId)
            ->active()
            ->valid()
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getCurrentPriceForProduct(int $productId): ?SellPrice
    {
        return $this->model
            ->where('product_id', $productId)
            ->active()
            ->valid()
            ->orderBy('created_at', 'desc')
            ->first();
    }

    public function checkDateOverlap(int $productId, string $startDate, string $endDate, ?int $excludeId = null): bool
    {
        $query = $this->model
            ->where('product_id', $productId)
            ->where('is_active', true)
            ->where(function($q) use ($startDate, $endDate) {
                $q->where(function($sub) use ($startDate, $endDate) {
                    $sub->where('start_date', '<=', $endDate)
                        ->where('end_date', '>=', $startDate);
                });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    protected function applyFilters($query, array $filters)
    {
        foreach ($filters as $key => $value) {
            if (!empty($value)) {
                switch ($key) {
                    case 'product_id':
                        $query->where('product_id', $value);
                        break;
                    case 'is_active':
                        $query->where('is_active', $value);
                        break;
                    case 'date':
                        $query->where('start_date', '<=', $value)
                            ->where('end_date', '>=', $value);
                        break;
                    case 'search':
                        $query->whereHas('product', function($q) use ($value) {
                            $q->where('name', 'like', "%{$value}%");
                        });
                        break;
                    case 'from_date':
                        $query->where('start_date', '>=', $value);
                        break;
                    case 'to_date':
                        $query->where('end_date', '<=', $value);
                        break;
                }
            }
        }

        return $query;
    }
}
