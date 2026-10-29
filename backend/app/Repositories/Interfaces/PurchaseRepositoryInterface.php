<?php

namespace App\Repositories\Interfaces;

use App\Models\purchase\Purchase;
use Illuminate\Pagination\LengthAwarePaginator;

interface PurchaseRepositoryInterface
{
    public function all(array $filters = []): LengthAwarePaginator;
    public function find(int $id): ?Purchase;
    public function create(array $data): Purchase;
    public function update(int $id, array $data): Purchase;
    public function delete(int $id): bool;
    public function generatePoNo(int $companyId): string;
}
