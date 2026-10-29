<?php

namespace App\Repositories;

use App\Models\sales\SaleDetail;
use App\Repositories\Interfaces\SaleDetailRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class SaleDetailRepository implements SaleDetailRepositoryInterface
{
    protected $model;

    public function __construct(SaleDetail $model)
    {
        $this->model = $model;
    }

    public function getBySale(int $saleId): Collection
    {
        return $this->model->where('sale_id', $saleId)
            ->with(['product.unit'])
            ->get();
    }

    public function find(int $id): ?SaleDetail
    {
        return $this->model->with(['product', 'sale'])->find($id);
    }

    public function create(array $data): SaleDetail
    {
        // Calculate total amount if not provided
        if (!isset($data['total_amount']) && isset($data['price']) && isset($data['quantity']) && isset($data['discount'])) {
            $data['total_amount'] = ($data['price'] * $data['quantity']) - $data['discount'];
        }

        return DB::transaction(function () use ($data) {
            $detail = $this->model->create($data);

            // Update stock if needed
            if (isset($data['product_id']) && isset($data['quantity'])) {
                $this->updateStock($data['product_id'], $data['quantity'], 'decrement');
            }

            return $detail->load(['product.unit']);
        });
    }

    public function update(int $id, array $data): bool
    {
        $detail = $this->find($id);

        if (!$detail) {
            return false;
        }

        // Handle stock adjustment if quantity changed
        if (isset($data['quantity']) && $data['quantity'] != $detail->quantity) {
            $oldQuantity = $detail->quantity;
            $newQuantity = $data['quantity'];

            // Increment back the old quantity
            $this->updateStock($detail->product_id, $oldQuantity, 'increment');

            // Decrement the new quantity
            $this->updateStock($detail->product_id, $newQuantity, 'decrement');
        }

        return $detail->update($data);
    }

    public function delete(int $id): bool
    {
        $detail = $this->find($id);

        if ($detail) {
            // Restore stock when deleting a sale detail
            $this->updateStock($detail->product_id, $detail->quantity, 'increment');

            return $detail->delete();
        }

        return false;
    }

    public function deleteBySale(int $saleId): bool
    {
        $details = $this->getBySale($saleId);

        foreach ($details as $detail) {
            // Restore stock for each detail
            $this->updateStock($detail->product_id, $detail->quantity, 'increment');
        }

        return $this->model->where('sale_id', $saleId)->delete();
    }

    public function updateStock(int $productId, int $quantity, string $operation = 'decrement'): bool
    {
        // Assuming you have a Product model with stock field
        $productClass = config('product.model', 'App\\Models\\Product');

        if (class_exists($productClass)) {
            $product = $productClass::find($productId);

            if ($product) {
                if ($operation === 'decrement') {
                    $product->decrement('stock', $quantity);
                } else {
                    $product->increment('stock', $quantity);
                }
                return true;
            }
        }

        return false;
    }
}
