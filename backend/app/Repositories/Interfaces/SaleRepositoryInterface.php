<?php

namespace App\Repositories\Interfaces;

use App\Models\sales\Sale;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface SaleRepositoryInterface
{
    public function all(): Collection;
    public function paginate(int $perPage = 15): LengthAwarePaginator;
    public function find(int $id): ?Sale;
    public function findBySoNo(string $soNo): ?Sale;
    public function create(array $data): Sale;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function restore(int $id): bool;
    public function forceDelete(int $id): bool;
    public function withDetails(int $id): ?Sale;
    public function getByDateRange(string $startDate, string $endDate): Collection;
    public function getByCustomer(string $customerId): Collection;
    public function getTodaySales(): Collection;
    public function approve(int $id, int $userId): bool;
}
