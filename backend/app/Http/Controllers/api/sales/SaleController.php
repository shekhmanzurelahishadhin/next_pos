<?php

namespace App\Http\Controllers\api\sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\sales\StoreSaleRequest;
use App\Http\Requests\sales\UpdateSaleRequest;
use App\Http\Resources\sales\SaleResource;
use App\Repositories\Interfaces\SaleRepositoryInterface;
use App\Helpers\ApiResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    protected $saleRepository;

    public function __construct(SaleRepositoryInterface $saleRepository)
    {
        $this->saleRepository = $saleRepository;

        // Apply middleware if needed
        // $this->middleware('auth:api')->except(['index', 'show']);
    }

    /**
     * Display a listing of sales.
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->get('per_page', 15);
            $sales = $this->saleRepository->paginate($perPage);

            $responseData = [
                'data' => SaleResource::collection($sales),
                'meta' => [
                    'current_page' => $sales->currentPage(),
                    'per_page' => $sales->perPage(),
                    'total' => $sales->total(),
                    'last_page' => $sales->lastPage(),
                ]
            ];

            return ApiResponse::success($responseData, 'Sales retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve sales');
        }
    }

    /**
     * Store a newly created sale.
     */
    public function store(StoreSaleRequest $request)
    {
        try {
            $validated = $request->validated();
            $sale = $this->saleRepository->create($validated);

            return ApiResponse::success(
                new SaleResource($sale),
                'Sale created successfully',
                201
            );
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create sale');
        }
    }

    /**
     * Display the specified sale.
     */
    public function show(int $id)
    {
        try {
            $sale = $this->saleRepository->withDetails($id);

            if (!$sale) {
                return ApiResponse::notFound('Sale not found');
            }

            return ApiResponse::success(
                new SaleResource($sale),
                'Sale retrieved successfully'
            );
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve sale');
        }
    }

    /**
     * Update the specified sale.
     */
    public function update(UpdateSaleRequest $request, int $id)
    {
        try {
            $validated = $request->validated();
            $updated = $this->saleRepository->update($id, $validated);

            if (!$updated) {
                return ApiResponse::notFound('Sale not found');
            }

            $sale = $this->saleRepository->find($id);

            return ApiResponse::success(
                new SaleResource($sale),
                'Sale updated successfully'
            );
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update sale');
        }
    }

    /**
     * Remove the specified sale.
     */
    public function destroy(int $id)
    {
        try {
            $deleted = $this->saleRepository->delete($id);

            if (!$deleted) {
                return ApiResponse::notFound('Sale not found');
            }

            return ApiResponse::success([], 'Sale deleted successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to delete sale');
        }
    }

    public function approve(int $id)
    {
        try {
            $approved = $this->saleRepository->approve($id, auth()->id());

            if (!$approved) {
                return ApiResponse::error('Sale not found or already approved', 422);
            }

            return ApiResponse::success([], 'Sale approved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to approve sale');
        }
    }


    /**
     * Get sales by date range.
     */
    public function getByDateRange(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date'
        ]);

        try {
            $sales = $this->saleRepository->getByDateRange(
                $request->start_date,
                $request->end_date
            );

            $responseData = [
                'data' => SaleResource::collection($sales),
                'meta' => [
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'count' => $sales->count()
                ]
            ];

            return ApiResponse::success($responseData, 'Sales retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve sales');
        }
    }

    /**
     * Get today's sales.
     */
    public function getTodaySales()
    {
        try {
            $sales = $this->saleRepository->getTodaySales();

            $responseData = [
                'data' => SaleResource::collection($sales),
                'meta' => [
                    'date' => today()->toDateString(),
                    'count' => $sales->count()
                ]
            ];

            return ApiResponse::success($responseData, 'Today\'s sales retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve today\'s sales');
        }
    }

    /**
     * Get sales by customer.
     */
    public function getByCustomer(string $customerId)
    {
        try {
            $sales = $this->saleRepository->getByCustomer($customerId);

            $responseData = [
                'data' => SaleResource::collection($sales),
                'meta' => [
                    'customer_id' => $customerId,
                    'count' => $sales->count()
                ]
            ];

            return ApiResponse::success($responseData, 'Customer sales retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve customer sales');
        }
    }

    /**
     * Restore a soft-deleted sale.
     */
    public function restore(int $id)
    {
        try {
            $restored = $this->saleRepository->restore($id);

            if (!$restored) {
                return ApiResponse::notFound('Sale not found');
            }

            return ApiResponse::success([], 'Sale restored successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to restore sale');
        }
    }
}
