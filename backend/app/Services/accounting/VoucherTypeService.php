<?php

namespace App\Services\accounting;

use App\Models\accounting\VoucherType;
use Illuminate\Support\Facades\Auth;

// Voucher Type (parts_bazar accounting/voucherNoFormate): the types are fixed,
// only the format can be updated, there is no add and no delete
class VoucherTypeService
{
    public function getList(array $filters)
    {
        $query = VoucherType::query()->with(['createdBy:id,name', 'updatedBy:id,name']);

        if (!empty($filters['id'])) {
            $query->where('id', $filters['id']);
        }
        if (!empty($filters['type_format'])) {
            $query->where('type_format', 'like', '%' . $filters['type_format'] . '%');
        }

        return $query->orderBy('id')->get();
    }

    public function update(VoucherType $voucherType, array $data)
    {
        $voucherType->type_format = $data['type_format'];
        $voucherType->updated_by = Auth::id();
        $voucherType->save();

        return $voucherType;
    }
}
