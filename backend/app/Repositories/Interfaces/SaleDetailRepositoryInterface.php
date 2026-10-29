<?php

namespace App\Repositories\Interfaces;

use App\Models\sales\SaleDetail;
use Illuminate\Database\Eloquent\Collection;

interface SaleDetailRepositoryInterface
{
    public function getBySale(int $saleId): Collection;
    public function find(int $id): ?SaleDetail;
    public function create(array $data): SaleDetail;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function deleteBySale(int $saleId): bool;
    public function updateStock(int $productId, int $quantity, string $operation = 'decrement'): bool;
}
