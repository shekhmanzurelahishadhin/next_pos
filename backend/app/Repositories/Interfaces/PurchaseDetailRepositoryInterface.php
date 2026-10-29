<?php

namespace App\Repositories\Interfaces;

use App\Models\purchase\PurchaseDetail;
use Illuminate\Database\Eloquent\Collection;

interface PurchaseDetailRepositoryInterface
{
    public function all(array $relations = []): Collection;
    public function find(int $id, array $relations = []): ?PurchaseDetail;
    public function findByPurchaseId(int $purchaseId, array $relations = []): Collection;
    public function create(array $data): PurchaseDetail;
    public function createMany(array $data): bool;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;
    public function deleteByPurchaseId(int $purchaseId): bool;
    public function getProductSummary(int $productId, array $filters = []): array;
}
