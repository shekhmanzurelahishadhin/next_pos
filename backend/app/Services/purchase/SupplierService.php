<?php

namespace App\Services\purchase;

use App\Models\purchase\Supplier;
use Illuminate\Support\Facades\DB;

class SupplierService
{
    // Supplier list with the search filters; paginated when perPage is given
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

        // status "trash" shows the deleted suppliers, any other status filters by it
        $status = $filters['status'] ?? '';
        if ($status === 'trash') {
            $query->onlyTrashed();
        } elseif ($status !== '' && $status !== null) {
            $query->where('status', $status);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['address'])) {
            $query->where('address', 'like', '%' . $filters['address'] . '%');
        }
        if (!empty($filters['email'])) {
            $query->where('email', 'like', '%' . $filters['email'] . '%');
        }
        if (!empty($filters['phone'])) {
            $query->where('phone', 'like', '%' . $filters['phone'] . '%');
        }
        if (!empty($filters['opening_balance'])) {
            $query->where('opening_balance', 'like', '%' . $filters['opening_balance'] . '%');
        }
        if (!empty($filters['opening_balance_type'])) {
            $query->where('opening_balance_type', $filters['opening_balance_type']);
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the supplier
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with(['createdBy:id,name', 'balanceType:code,name'])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    public function createSupplier(array $data)
    {
        DB::beginTransaction();
        try {
            // a new unique supplier code, like SUP0001
            $data['code'] = generateCode('SUP', 'suppliers', 'code');
            $supplier = Supplier::create($data);

            DB::commit();
            return $supplier;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function updateSupplier(Supplier $supplier, array $data)
    {
        $supplier->update($data);

        return $supplier->fresh();
    }

    // move to trash
    public function softDeleteSupplier(Supplier $supplier)
    {
        $supplier->delete();
    }

    // take back from trash
    public function restoreSupplier(Supplier $supplier)
    {
        if ($supplier->trashed()) {
            $supplier->restore();
        }

        return $supplier;
    }

    // delete for ever; only a supplier in the trash can be deleted
    public function forceDeleteSupplier(Supplier $supplier)
    {
        if (!$supplier->trashed()) {
            return false;
        }

        $supplier->forceDelete();
        return true;
    }
}
