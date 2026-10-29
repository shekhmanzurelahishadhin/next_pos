<?php

namespace App\Http\Controllers\api\softConfig;

use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\purchasePrice\PurchasePriceRequest;
use App\Http\Resources\softConfig\purchasePrice\PurchasePriceResource;
use App\Models\softConfig\PurchasePrice;
use App\Helpers\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PurchasePriceController extends Controller
{
    /**
     * Display a listing of purchase prices.
     */
    public function index(Request $request)
    {
        try {
            $query = PurchasePrice::with(['product', 'createdBy', 'updatedBy'])
                ->orderBy('created_at', 'desc');

            // Filter by product_id
            if ($request->has('product_id') && $request->product_id) {
                $query->where('product_id', $request->product_id);
            }

            // Filter by PO number
            if ($request->has('po_no') && $request->po_no) {
                $query->where('po_no', 'like', '%' . $request->po_no . '%');
            }

            // Filter by month
            if ($request->has('month') && $request->month) {
                $query->where('month', $request->month);
            }

            // Filter by year
            if ($request->has('year') && $request->year) {
                $query->where('year', $request->year);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date &&
                $request->has('end_date') && $request->end_date) {
                $query->whereBetween('date', [$request->start_date, $request->end_date]);
            }

            // Search in multiple fields
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('po_no', 'like', "%{$search}%")
                        ->orWhereHas('product', function($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhere('sku', 'like', "%{$search}%");
                        });
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $purchasePrices = $query->paginate($perPage);

            return ApiResponse::success([
                'data' => PurchasePriceResource::collection($purchasePrices),
                'pagination' => [
                    'current_page' => $purchasePrices->currentPage(),
                    'last_page' => $purchasePrices->lastPage(),
                    'per_page' => $purchasePrices->perPage(),
                    'total' => $purchasePrices->total(),
                    'from' => $purchasePrices->firstItem(),
                    'to' => $purchasePrices->lastItem(),
                ]
            ], 'Purchase prices retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve purchase prices: ' . $e->getMessage());
        }
    }

    /**
     * Store a newly created purchase price.
     */
    public function store(PurchasePriceRequest $request)
    {
        DB::beginTransaction();
        try {
            // Get authenticated user ID
            $userId = Auth::id();

            // Prepare data with audit info
            $data = $request->validated();
            $data['created_by'] = $userId;
            $data['updated_by'] = $userId;

            // Auto-fill month and year from date if not provided
            if ($request->has('date') && !$request->has('month')) {
                $data['month'] = date('n', strtotime($request->date)); // 1-12
            }

            if ($request->has('date') && !$request->has('year')) {
                $data['year'] = date('Y', strtotime($request->date));
            }

            // Create purchase price
            $purchasePrice = PurchasePrice::create($data);

            // Load relationships
            $purchasePrice->load(['product', 'createdBy', 'updatedBy']);

            DB::commit();

            return ApiResponse::success(
                new PurchasePriceResource($purchasePrice),
                'Purchase price created successfully',
                201
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return ApiResponse::serverError('Failed to create purchase price: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified purchase price.
     */
    public function show($id)
    {
        try {
            $purchasePrice = PurchasePrice::with([
                'product',
                'createdBy',
                'updatedBy',
                'deletedBy'
            ])->find($id);

            if (!$purchasePrice) {
                return ApiResponse::notFound('Purchase price not found');
            }

            return ApiResponse::success(
                new PurchasePriceResource($purchasePrice),
                'Purchase price retrieved successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve purchase price: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified purchase price.
     */
    public function update(PurchasePriceRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $purchasePrice = PurchasePrice::find($id);

            if (!$purchasePrice) {
                return ApiResponse::notFound('Purchase price not found');
            }

            // Update purchase price with audit info
            $data = $request->validated();
            $data['updated_by'] = Auth::id();

            // Auto-update month and year from date if date is changed
            if ($request->has('date') && $request->date != $purchasePrice->date) {
                if (!$request->has('month')) {
                    $data['month'] = date('n', strtotime($request->date));
                }
                if (!$request->has('year')) {
                    $data['year'] = date('Y', strtotime($request->date));
                }
            }

            $purchasePrice->update($data);

            // Refresh with relationships
            $purchasePrice->refresh();
            $purchasePrice->load(['product', 'updatedBy', 'createdBy']);

            DB::commit();

            return ApiResponse::success(
                new PurchasePriceResource($purchasePrice),
                'Purchase price updated successfully'
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return ApiResponse::serverError('Failed to update purchase price: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified purchase price (soft delete).
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $purchasePrice = PurchasePrice::find($id);

            if (!$purchasePrice) {
                return ApiResponse::notFound('Purchase price not found');
            }

            // Soft delete with audit info
            $purchasePrice->deleted_by = Auth::id();
            $purchasePrice->save();
            $purchasePrice->delete();

            DB::commit();

            return ApiResponse::success(null, 'Purchase price deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return ApiResponse::serverError('Failed to delete purchase price: ' . $e->getMessage());
        }
    }

    /**
     * Restore a soft-deleted purchase price.
     */
    public function restore($id)
    {
        DB::beginTransaction();
        try {
            $purchasePrice = PurchasePrice::withTrashed()->find($id);

            if (!$purchasePrice) {
                return ApiResponse::notFound('Purchase price not found');
            }

            if (!$purchasePrice->trashed()) {
                return ApiResponse::error('Purchase price is not deleted');
            }

            // Restore and clear deleted_by
            $purchasePrice->deleted_by = null;
            $purchasePrice->save();
            $purchasePrice->restore();

            // Load relationships
            $purchasePrice->load(['product', 'createdBy']);

            DB::commit();

            return ApiResponse::success(
                new PurchasePriceResource($purchasePrice),
                'Purchase price restored successfully'
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return ApiResponse::serverError('Failed to restore purchase price: ' . $e->getMessage());
        }
    }

    /**
     * Permanently delete a purchase price.
     */
    public function forceDelete($id)
    {
        DB::beginTransaction();
        try {
            $purchasePrice = PurchasePrice::withTrashed()->find($id);

            if (!$purchasePrice) {
                return ApiResponse::notFound('Purchase price not found');
            }

            // Check if already permanently deleted
            if (!$purchasePrice->trashed()) {
                return ApiResponse::error('Purchase price must be soft-deleted first');
            }

            $purchasePrice->forceDelete();

            DB::commit();

            return ApiResponse::success(null, 'Purchase price permanently deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return ApiResponse::serverError('Failed to permanently delete purchase price: ' . $e->getMessage());
        }
    }

    /**
     * Get purchase prices summary by product.
     */
    public function summaryByProduct(Request $request)
    {
        try {
            $summary = PurchasePrice::select([
                'product_id',
                DB::raw('COUNT(*) as total_records'),
                DB::raw('SUM(qty) as total_quantity'),
                DB::raw('AVG(price) as average_price'),
                DB::raw('MIN(price) as min_price'),
                DB::raw('MAX(price) as max_price'),
                DB::raw('MIN(date) as first_purchase_date'),
                DB::raw('MAX(date) as last_purchase_date'),
                DB::raw('SUM(price * qty) as total_value')
            ])
                ->with('product')
                ->groupBy('product_id')
                ->orderBy('total_records', 'desc')
                ->get();

            return ApiResponse::success($summary, 'Purchase summary by product retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve purchase summary: ' . $e->getMessage());
        }
    }

    /**
     * Get purchase price history for a specific product.
     */
    public function productHistory($productId)
    {
        try {
            $history = PurchasePrice::with(['createdBy', 'product'])
                ->where('product_id', $productId)
                ->orderBy('date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            if ($history->isEmpty()) {
                return ApiResponse::notFound('No purchase history found for this product');
            }

            return ApiResponse::success(
                PurchasePriceResource::collection($history),
                'Purchase history retrieved successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve purchase history: ' . $e->getMessage());
        }
    }

    /**
     * Get monthly purchase summary.
     */
    public function monthlySummary(Request $request)
    {
        try {
            $query = PurchasePrice::select([
                DB::raw('YEAR(date) as year'),
                DB::raw('MONTH(date) as month'),
                DB::raw('COUNT(*) as total_purchases'),
                DB::raw('SUM(qty) as total_quantity'),
                DB::raw('SUM(price * qty) as total_amount'),
                DB::raw('AVG(price) as average_price')
            ])
                ->whereNotNull('date')
                ->groupBy(DB::raw('YEAR(date), MONTH(date)'))
                ->orderBy('year', 'desc')
                ->orderBy('month', 'desc');

            // Filter by year if provided
            if ($request->has('year') && $request->year) {
                $query->whereYear('date', $request->year);
            }

            // Filter by month if provided
            if ($request->has('month') && $request->month) {
                $query->whereMonth('date', $request->month);
            }

            $summary = $query->get();

            return ApiResponse::success($summary, 'Monthly purchase summary retrieved successfully');

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve monthly summary: ' . $e->getMessage());
        }
    }

    /**
     * Get latest purchase prices for all products.
     */
    public function latestPrices()
    {
        try {
            // Subquery to get the latest purchase date for each product
            $latestPurchases = PurchasePrice::select('product_id', DB::raw('MAX(date) as latest_date'))
                ->whereNotNull('date')
                ->groupBy('product_id');

            // Join with main query to get latest purchase details
            $prices = PurchasePrice::select('purchase_prices.*')
                ->joinSub($latestPurchases, 'latest', function($join) {
                    $join->on('purchase_prices.product_id', '=', 'latest.product_id')
                        ->on('purchase_prices.date', '=', 'latest.latest_date');
                })
                ->with(['product', 'createdBy'])
                ->orderBy('purchase_prices.product_id')
                ->get();

            return ApiResponse::success(
                PurchasePriceResource::collection($prices),
                'Latest purchase prices retrieved successfully'
            );

        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve latest prices: ' . $e->getMessage());
        }
    }

    /**
     * Bulk import purchase prices.
     */
    public function bulkImport(Request $request)
    {
        $request->validate([
            'prices' => 'required|array',
            'prices.*.po_no' => 'nullable|string|max:255',
            'prices.*.product_id' => 'required|exists:products,id',
            'prices.*.price' => 'required|numeric|min:0',
            'prices.*.qty' => 'required|numeric|min:0',
            'prices.*.date' => 'nullable|date',
        ]);

        DB::beginTransaction();
        try {
            $userId = Auth::id();
            $imported = [];
            $errors = [];

            foreach ($request->prices as $index => $priceData) {
                try {
                    // Auto-calculate month and year from date
                    if (isset($priceData['date'])) {
                        $priceData['month'] = date('n', strtotime($priceData['date']));
                        $priceData['year'] = date('Y', strtotime($priceData['date']));
                    }

                    // Add audit info
                    $priceData['created_by'] = $userId;
                    $priceData['updated_by'] = $userId;

                    $purchasePrice = PurchasePrice::create($priceData);
                    $purchasePrice->load(['product']);
                    $imported[] = new PurchasePriceResource($purchasePrice);

                } catch (\Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'data' => $priceData,
                        'error' => $e->getMessage()
                    ];
                }
            }

            if (!empty($errors)) {
                DB::rollBack();
                return ApiResponse::error(
                    'Some records failed to import',
                    422,
                    ['errors' => $errors, 'successful' => $imported]
                );
            }

            DB::commit();

            return ApiResponse::success(
                ['imported' => $imported],
                count($imported) . ' purchase prices imported successfully',
                201
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return ApiResponse::serverError('Bulk import failed: ' . $e->getMessage());
        }
    }
}
