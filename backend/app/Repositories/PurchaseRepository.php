<?php

namespace App\Repositories;

use App\Models\purchase\Purchase;
use App\Repositories\Interfaces\PurchaseRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class PurchaseRepository implements PurchaseRepositoryInterface
{
    public function all(array $filters = []): LengthAwarePaginator
    {
        $query = Purchase::with(['company', 'supplier', 'details.product'])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if (!empty($filters['company_id'])) {
            $query->where('company_id', $filters['company_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['po_no'])) {
            $query->where('po_no', 'like', '%' . $filters['po_no'] . '%');
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('purchase_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('purchase_date', '<=', $filters['date_to']);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }

    public function find(int $id): ?Purchase
    {
        return Purchase::with(['company', 'supplier', 'details.product'])->find($id);
    }

    public function create(array $data): Purchase
    {
        DB::beginTransaction();

        try {
            // Generate PO number
            $data['po_no'] = $this->generatePoNo($data['company_id']);

            // Get global max_sl_no
            $maxSlNo = Purchase::max('max_sl_no') ?? 0;
            $data['max_sl_no'] = $maxSlNo + 1;

            // Get company specific serial number
            $companySlNo = Purchase::where('company_id', $data['company_id'])
                ->max('company_sl_no') ?? 0;
            $data['company_sl_no'] = $companySlNo + 1;

            // Create purchase
            $purchase = Purchase::create($data);

            // Create purchase details if provided
            if (!empty($data['items'])) {
                $this->createPurchaseDetails($purchase, $data['items']);
            }

            // Calculate and update totals
            $this->updatePurchaseTotals($purchase);

            DB::commit();
            return $purchase->load(['company', 'supplier', 'details.product']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function update(int $id, array $data): Purchase
    {
        DB::beginTransaction();

        try {
            $purchase = Purchase::findOrFail($id);

            // Update purchase
            $purchase->update($data);

            // Update purchase details if provided
            if (!empty($data['items'])) {
                $purchase->details()->delete();
                $this->createPurchaseDetails($purchase, $data['items']);
            }

            // Recalculate totals
            $this->updatePurchaseTotals($purchase);

            DB::commit();
            return $purchase->load(['company', 'supplier', 'details.product']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function delete(int $id): bool
    {
        $purchase = Purchase::findOrFail($id);
        return $purchase->delete();
    }

    public function generatePoNo(int $companyId): string
    {
        // Get company code/prefix (you might want to fetch from companies table)
        $companyCode = strtoupper(substr($companyId == 1 ? 'ABC' : 'XYZ', 0, 3));

        // Get last PO for this company
        $lastPo = Purchase::where('company_id', $companyId)
            ->orderBy('company_sl_no', 'desc')
            ->first();

        // Increment company serial number
        $nextSlNo = $lastPo ? $lastPo->company_sl_no + 1 : 1;

        // Format: ABC-0001, XYZ-0001, etc.
        return $companyCode . '-' . str_pad($nextSlNo, 4, '0', STR_PAD_LEFT);
    }

    private function createPurchaseDetails(Purchase $purchase, array $items): void
    {
        $details = [];
        foreach ($items as $item) {
            $details[] = [
                'purchase_id' => $purchase->id,
                'location_id' => $item['location_id'],
                'product_id' => $item['product_id'],
                'unit' => $item['unit'],
                'qty' => $item['qty'],
                'unit_price' => $item['unit_price'],
                'per_kg' => $item['per_kg'] ?? null,
                'sell_price' => $item['sell_price'],
                'total_unit_price' => $item['qty'] * $item['unit_price'],
                'total_product_price' => $item['qty'] * $item['unit_price'],
                'weight_unit' => $item['weight_unit'] ?? null,
                'total_weight' => $item['total_weight'] ?? null,
                'total_weight_amount' => $item['total_weight_amount'] ?? null,
                'total_purchase_price' => $this->calculateTotalPurchasePrice($item),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        $purchase->details()->insert($details);
    }

    private function calculateTotalPurchasePrice(array $item): float
    {
        $basePrice = $item['qty'] * $item['unit_price'];

        if (!empty($item['total_weight_amount'])) {
            return $basePrice + $item['total_weight_amount'];
        }

        return $basePrice;
    }

    private function updatePurchaseTotals(Purchase $purchase): void
    {
        $total = $purchase->details()->sum('total_purchase_price');

        $purchase->update([
            'grand_total' => $total,
            'due_amount' => $total - ($purchase->payment_amount ?? 0),
            'full_paid' => ($total - ($purchase->payment_amount ?? 0) <= 0) ? 1 : 0
        ]);
    }
}
