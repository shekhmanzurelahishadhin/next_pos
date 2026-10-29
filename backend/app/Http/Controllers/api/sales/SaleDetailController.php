<?php

namespace App\Http\Controllers\api\sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaleDetail\StoreSaleDetailRequest;
use App\Http\Requests\SaleDetail\UpdateSaleDetailRequest;
use App\Http\Resources\SaleDetailResource;
use App\Repositories\Interfaces\SaleDetailRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SaleDetailController extends Controller
{
    protected $saleDetailRepository;

    public function __construct(SaleDetailRepositoryInterface $saleDetailRepository)
    {
        $this->saleDetailRepository = $saleDetailRepository;
        $this->middleware('auth:api');
    }

    /**
     * Get details by sale ID.
     */
    public function getBySale(int $saleId): JsonResponse
    {
        try {
            $details = $this->saleDetailRepository->getBySale($saleId);

            return response()->json([
                'success' => true,
                'data' => SaleDetailResource::collection($details),
                'meta' => [
                    'sale_id' => $saleId,
                    'count' => $details->count()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve sale details',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Store a new sale detail.
     */
    public function store(StoreSaleDetailRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $detail = $this->saleDetailRepository->create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Sale detail created successfully',
                'data' => new SaleDetailResource($detail)
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create sale detail',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified sale detail.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $detail = $this->saleDetailRepository->find($id);

            if (!$detail) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sale detail not found'
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'data' => new SaleDetailResource($detail)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve sale detail',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update the specified sale detail.
     */
    public function update(UpdateSaleDetailRequest $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validated();
            $updated = $this->saleDetailRepository->update($id, $validated);

            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sale detail not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $detail = $this->saleDetailRepository->find($id);

            return response()->json([
                'success' => true,
                'message' => 'Sale detail updated successfully',
                'data' => new SaleDetailResource($detail)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sale detail',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove the specified sale detail.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->saleDetailRepository->delete($id);

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sale detail not found'
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'success' => true,
                'message' => 'Sale detail deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete sale detail',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
