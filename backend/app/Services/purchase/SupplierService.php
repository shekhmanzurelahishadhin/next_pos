<?php


namespace App\Services\purchase;


use App\Models\purchase\Supplier;
use App\Models\purchase\SupplierLedger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SupplierService
{
    public function getSuppliers(array $filters = [], $perPage = null)
    {
        $query = Supplier::query()->select(
            'id',
            'name',
            'code',
            'address',
            'opening_balance',
            'opening_balance_type',
            'phone',
            'email',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'deleted_at'
        );
        // Handle status / trash logic
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }
//        else {
//            $query->withTrashed();
//        }

        // Apply filters
        $query
            ->when($filters['name'] ?? null, fn($q, $name) => $q->where('name', 'like', "%{$name}%"))
            ->when($filters['code'] ?? null, fn($q, $code) => $q->where('code', 'like', "%{$code}%"))
            ->when($filters['address'] ?? null, fn($q, $address) => $q->where('address', 'like', "%{$address}%"))
            ->when($filters['email'] ?? null, fn($q, $email) => $q->where('email', 'like', "%{$email}%"))
            ->when($filters['phone'] ?? null, fn($q, $phone) => $q->where('phone', 'like', "%{$phone}%"))
            ->when($filters['opening_balance'] ?? null, fn($q, $opening_balance) => $q->where('opening_balance', 'like', "%{$opening_balance}%"))
            ->when($filters['opening_balance_type'] ?? null, fn($q, $opening_balance_type) => $q->where('opening_balance_type',  $opening_balance_type))
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")))
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt))));

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
            'balanceType:code,name'
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    public function createSupplier(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Generate unique supplier code
            $data['code'] = generateCode('SUP', 'suppliers', 'code');

            // Create supplier
            $supplier = Supplier::create($data);

            return $supplier;
        });
    }


    public function updateSupplier(Supplier $supplier, array $data)
    {
        return DB::transaction(function () use ($supplier, $data) {

            // Update supplier basic info
            $supplier->update($data);

            return $supplier->fresh(); // return the updated supplier with relations if needed
        });
    }



    public function softDeleteSupplier(Supplier $supplier)
    {
        $supplier->delete();
    }

    public function restoreSupplier(Supplier $supplier)
    {
        if ($supplier->trashed()) {
            $supplier->restore();
        }
        return $supplier;
    }

    public function forceDeleteSupplier(Supplier $supplier)
    {
        if ($supplier->trashed()) {
            $supplier->forceDelete();
            return true;
        }
        return false;
    }

}
