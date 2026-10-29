<?php

namespace App\Services\sales;

use App\Helpers\ApiResponse;
use App\Repositories\Interfaces\SellPriceRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class SellPriceService
{
    protected $repository;

    public function __construct(SellPriceRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getAllPrices(array $filters = []): Collection
    {
        return $this->repository->getAll($filters);
    }

    public function getPaginatedPrices(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->repository->getPaginated($perPage, $filters);
    }

    public function getPriceById(int $id)
    {
        $price = $this->repository->findById($id);

        if (!$price) {
            return ApiResponse::notFound('Sell price not found');
        }

        return ApiResponse::success($price);
    }

    public function createPrice(array $data)
    {
        try {
            // Add created_by if not present
            if (!isset($data['created_by']) && Auth::check()) {
                $data['created_by'] = Auth::id();
            }

            // Validate date ranges
            if (isset($data['start_date']) && isset($data['end_date'])) {
                if ($data['start_date'] > $data['end_date']) {
                    return ApiResponse::error('Start date cannot be after end date');
                }

                // Check for date overlap
                $hasOverlap = $this->repository->checkDateOverlap(
                    $data['product_id'],
                    $data['start_date'],
                    $data['end_date']
                );

                if ($hasOverlap) {
                    return ApiResponse::error('Price date range overlaps with an existing active price');
                }
            }

            // Calculate discount if not provided
            if (!isset($data['discount']) && isset($data['sell_price']) && isset($data['market_price'])) {
                if ($data['market_price'] > 0) {
                    $data['discount'] = (($data['market_price'] - $data['sell_price']) / $data['market_price']) * 100;
                }
            }

            $price = $this->repository->create($data);
            return ApiResponse::success($price, 'Sell price created successfully', 201);

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create sell price: ' . $e->getMessage());
        }
    }

    public function updatePrice(int $id, array $data)
    {
        try {
            // Check if price exists
            $price = $this->repository->findById($id);
            if (!$price) {
                return ApiResponse::notFound('Sell price not found');
            }

            // Add updated_by if not present
            if (!isset($data['updated_by']) && Auth::check()) {
                $data['updated_by'] = Auth::id();
            }

            // Validate date ranges if provided
            if ((isset($data['start_date']) || isset($data['end_date'])) && $price->is_active) {
                $startDate = $data['start_date'] ?? $price->start_date;
                $endDate = $data['end_date'] ?? $price->end_date;

                if ($startDate && $endDate && $startDate > $endDate) {
                    return ApiResponse::error('Start date cannot be after end date');
                }
            }

            // Recalculate discount if prices are updated
            if ((isset($data['sell_price']) || isset($data['market_price'])) && !isset($data['discount'])) {
                $sellPrice = $data['sell_price'] ?? $price->sell_price;
                $marketPrice = $data['market_price'] ?? $price->market_price;

                if ($marketPrice > 0) {
                    $data['discount'] = (($marketPrice - $sellPrice) / $marketPrice) * 100;
                }
            }

            $updatedPrice = $this->repository->update($id, $data);
            return ApiResponse::success($updatedPrice, 'Sell price updated successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update sell price: ' . $e->getMessage());
        }
    }

    public function deletePrice(int $id)
    {
        try {
            $price = $this->repository->findById($id);
            if (!$price) {
                return ApiResponse::notFound('Sell price not found');
            }

            $this->repository->delete($id);
            return ApiResponse::success(null, 'Sell price deleted successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to delete sell price: ' . $e->getMessage());
        }
    }

    public function restorePrice(int $id)
    {
        try {
            $price = $this->repository->findById($id);
            if ($price && !$price->trashed()) {
                return ApiResponse::error('Sell price is not deleted');
            }

            $restored = $this->repository->restore($id);
            if (!$restored) {
                return ApiResponse::notFound('Sell price not found');
            }

            return ApiResponse::success(null, 'Sell price restored successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore sell price: ' . $e->getMessage());
        }
    }

    public function getProductPrices(int $productId)
    {
        try {
            $prices = $this->repository->getActivePricesForProduct($productId);

            if ($prices->isEmpty()) {
                return ApiResponse::success([], 'No active prices found for this product');
            }

            return ApiResponse::success($prices);

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to fetch product prices: ' . $e->getMessage());
        }
    }

    public function getCurrentProductPrice(int $productId)
    {
        try {
            $price = $this->repository->getCurrentPriceForProduct($productId);

            if (!$price) {
                return ApiResponse::notFound('No active price found for this product');
            }

            return ApiResponse::success($price);

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to fetch current price: ' . $e->getMessage());
        }
    }

    public function calculateDiscount(int $productId)
    {
        try {
            $price = $this->repository->getCurrentPriceForProduct($productId);

            if (!$price) {
                return ApiResponse::notFound('No price information available for this product');
            }

            $calculation = [
                'original_price' => $price->market_price,
                'sell_price' => $price->sell_price,
                'discount_percentage' => $price->discount,
                'discount_amount' => $price->market_price - $price->sell_price,
                'you_save' => $price->market_price - $price->sell_price,
                'currency' => 'USD',
            ];

            return ApiResponse::success($calculation);

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to calculate discount: ' . $e->getMessage());
        }
    }
}
