<?php

namespace App\Repositories;

use App\Models\sales\Sale;
use App\Models\softConfig\Company;
use App\Repositories\Interfaces\SaleRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class SaleRepository implements SaleRepositoryInterface
{
    protected $model;

    public function __construct(Sale $model)
    {
        $this->model = $model;
    }

    public function all(): Collection
    {
        return $this->model->with(['details', 'company', 'customer'])->get();
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->with(['details', 'company', 'customer'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function find(int $id): ?Sale
    {
        return $this->model->with(['details.product', 'company', 'customer'])->find($id);
    }

    public function findBySoNo(string $soNo): ?Sale
    {
        return $this->model->where('so_no', $soNo)
            ->with(['details.product', 'company', 'customer'])
            ->first();
    }

    public function create(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $data['so_no'] = $this->generateSoNo($data['company_id']);

            // Check duplicate SO No
            if ($this->model->where('so_no', $data['so_no'])->exists()) {
                $data['so_no'] = $this->generateSoNo($data['company_id']);
            }

            $data['max_sl_no']                   = $this->generateMaxSlNo();
            $data['company_sl_no']               = $this->generateCompanySlNo($data['company_id']);
            $data['overall_discount']            = $data['overall_discount'] ?? 0;
            $data['vat_percentage']              = $data['vat_percentage'] ?? 0;
            $data['total_with_overall_discount'] = $data['grand_total'] - $data['overall_discount'];
            $data['vat_amount']                  = ($data['total_with_overall_discount'] * $data['vat_percentage']) / 100;
            $data['grand_total_with_vat']        = $data['total_with_overall_discount'] + $data['vat_amount'];

            $sale = $this->model->create($data);

            // Create sale details
            if (isset($data['details']) && is_array($data['details'])) {
                foreach ($data['details'] as $detail) {
                   // $detail['total_amount'] = $detail['quantity'] * $detail['unit_price'];
                    $sale->details()->create($detail);
                }
            }

            return $sale->load(['details.product', 'company', 'customer']);
        });
    }
    protected function generateSoNo(?int $companyId = null): string
    {
        $prefix = 'SO';
        $date = now()->format('Ymd');

        if ($companyId) {
            $company = Company::find($companyId);
            $companyCode = $company?->code ?? '';
            $sequence = $this->generateCompanySlNo($companyId);
            return sprintf('%s-%s-%s-%04d', $prefix, $companyCode, $date, $sequence);
        }

        $sequence = $this->generateMaxSlNo();
        return sprintf('%s-%s-%04d', $prefix, $date, $sequence);
    }
    /**
     * Generate global maximum serial number
     */
    protected function generateMaxSlNo(): int
    {
        $maxSlNo = $this->model->max('max_sl_no') ?? 0;
        return $maxSlNo + 1;
    }

    /**
     * Generate company-specific serial number
     */
    protected function generateCompanySlNo(int $companyId): int
    {
        $companySlNo = $this->model
            ->where('company_id', $companyId)
            ->max('company_sl_no') ?? 0;
        return $companySlNo + 1;
    }

    public function update(int $id, array $data): bool
    {
        return DB::transaction(function () use ($id, $data) {
            $sale = $this->find($id);

            if (!$sale) {
                return false;
            }

            // Recalculate derived fields if relevant data changed
            if (isset($data['grand_total']) || isset($data['overall_discount']) || isset($data['vat_percentage'])) {
                $grandTotal = $data['grand_total'] ?? $sale->grand_total;
                $overallDiscount = $data['overall_discount'] ?? $sale->overall_discount;
                $vatPercentage = $data['vat_percentage'] ?? $sale->vat_percentage;

                $totalWithDiscount = $grandTotal - $overallDiscount;
                $vatAmount = ($totalWithDiscount * $vatPercentage) / 100;

                $data['total_with_overall_discount'] = $totalWithDiscount;
                $data['vat_amount'] = $vatAmount;
                $data['grand_total_with_vat'] = $totalWithDiscount + $vatAmount;
            }

            return $sale->update($data);
        });
    }

    public function delete(int $id): bool
    {
        $sale = $this->find($id);
        return $sale ? $sale->delete() : false;
    }

    public function restore(int $id): bool
    {
        $sale = $this->model->withTrashed()->find($id);
        return $sale ? $sale->restore() : false;
    }

    public function forceDelete(int $id): bool
    {
        $sale = $this->model->withTrashed()->find($id);
        return $sale ? $sale->forceDelete() : false;
    }

    public function withDetails(int $id): ?Sale
    {
        return $this->model->with(['details.product.unit', 'company', 'customer'])->find($id);
    }

    public function getByDateRange(string $startDate, string $endDate): Collection
    {
        return $this->model->whereBetween('order_date', [$startDate, $endDate])
            ->with(['details', 'company', 'customer'])
            ->orderBy('order_date', 'desc')
            ->get();
    }

    public function getByCustomer(string $customerId): Collection
    {
        return $this->model->where('customer_id', $customerId)
            ->with(['details', 'company'])
            ->orderBy('order_date', 'desc')
            ->get();
    }

    public function getTodaySales(): Collection
    {
        return $this->model->whereDate('order_date', today())
            ->with(['details', 'company', 'customer'])
            ->orderBy('created_at', 'desc')
            ->get();
    }
    public function approve(int $id, int $userId): bool
    {
        return DB::transaction(function () use ($id, $userId) {
            $sale = $this->find($id);

            if (!$sale || $sale->status == 1) {
                return false;
            }

            return $sale->update([
                'status'       => 1,
                'approve_date' => date('Y-m-d'),
                'approve_by'   => $userId,
                'approve_at'   => now(),
            ]);
        });
    }

}
