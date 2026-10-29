<?php

namespace App\Repositories;

use App\Models\purchase\PurchaseDetail;
use App\Repositories\Interfaces\PurchaseDetailRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class PurchaseDetailRepository implements PurchaseDetailRepositoryInterface
{
    protected $model;

    public function __construct(PurchaseDetail $purchaseDetail)
    {
        $this->model = $purchaseDetail;
    }

    public function all(array $relations = []): Collection
    {
        return $this->model->with($relations)->latest()->get();
    }

    public function find(int $id, array $relations = []): ?PurchaseDetail
    {
        return $this->model->with($relations)->find($id);
    }

    public function findByPurchaseId(int $purchaseId, array $relations = []): Collection
    {
        return $this->model->with($relations)
            ->where('purchase_id', $purchaseId)
            ->get();
    }

    public function create(array $data): PurchaseDetail
    {
        return $this->model->create($data);
    }

    public function createMany(array $data): bool
    {
        return $this->model->insert($data);
    }

    public function update(int $id, array $data): bool
    {
        $detail = $this->find($id);

        if (!$detail) {
            return false;
        }

        return $detail->update($data);
    }

    public function delete(int $id): bool
    {
        $detail = $this->find($id);

        if (!$detail) {
            return false;
        }

        return $detail->delete();
    }

    public function deleteByPurchaseId(int $purchaseId): bool
    {
        return $this->model->where('purchase_id', $purchaseId)->delete();
    }

    public function getProductSummary(int $productId, array $filters = []): array
    {
        $query = $this->model->join('purchases', 'purchase_details.purchase_id', '=', 'purchases.id')
            ->where('purchase_details.product_id', $productId)
            ->where('purchases.status', 1);

        if (!empty($filters['start_date'])) {
            $query->whereDate('purchases.purchase_date', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $query->whereDate('purchases.purchase_date', '<=', $filters['end_date']);
        }

        if (!empty($filters['company_id'])) {
            $query->where('purchases.company_id', $filters['company_id']);
        }

        $result = $query->select(
            DB::raw('SUM(purchase_details.qty) as total_quantity'),
            DB::raw('SUM(purchase_details.total_purchase_price) as total_amount'),
            DB::raw('AVG(purchase_details.unit_price) as average_price')
        )
            ->first();

        return [
            'total_quantity' => (int) ($result->total_quantity ?? 0),
            'total_amount' => (float) ($result->total_amount ?? 0),
            'average_price' => (float) ($result->average_price ?? 0),
        ];
    }
}
