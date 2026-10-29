<?php

namespace App\Repositories\Interfaces;

use App\Models\sales\SellPrice;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface SellPriceRepositoryInterface
{
    public function getAll(array $filters = []): Collection;
    public function getPaginated(int $perPage = 15, array $filters = []): LengthAwarePaginator;
    public function findById(int $id): ?SellPrice;
    public function create(array $data): SellPrice;
    public function update(int $id, array $data): SellPrice;
    public function delete(int $id): bool;
    public function restore(int $id): bool;
    public function forceDelete(int $id): bool;
    public function getActivePricesForProduct(int $productId): Collection;
    public function getCurrentPriceForProduct(int $productId): ?SellPrice;
    public function checkDateOverlap(int $productId, string $startDate, string $endDate, ?int $excludeId = null): bool;
}
