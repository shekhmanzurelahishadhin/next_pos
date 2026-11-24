<?php

namespace App\Services\accounting;

use App\Models\accounting\VoucherSignatory;
use Illuminate\Support\Facades\Auth;

// Voucher Signatory Setup (parts_bazar accounting/voucherSignatorySetup)
class VoucherSignatoryService
{
    public function getList(array $filters)
    {
        $query = VoucherSignatory::query()->with(['type:id,name', 'createdBy:id,name', 'updatedBy:id,name']);

        if (!empty($filters['voucher_type'])) {
            $query->where('voucher_type', $filters['voucher_type']);
        }
        if (!empty($filters['signatory_name'])) {
            $query->where('signatory_name', 'like', '%' . $filters['signatory_name'] . '%');
        }
        if (!empty($filters['order_qty'])) {
            $query->where('order_qty', $filters['order_qty']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('voucher_type')->orderBy('order_qty')->get();
    }

    // active signatories of a voucher type in their order, for the voucher print
    public function activeOf($voucherType)
    {
        return VoucherSignatory::where('voucher_type', $voucherType)
            ->where('status', VoucherSignatory::ACTIVE)
            ->orderBy('order_qty')
            ->orderBy('id')
            ->get(['id', 'signatory_name', 'order_qty']);
    }

    public function save(array $data, $signatory = null)
    {
        if (!$signatory) {
            $signatory = new VoucherSignatory();
            $signatory->status = VoucherSignatory::ACTIVE;
            $signatory->created_by = Auth::id();
        } else {
            // status is only on the update form, like parts_bazar
            $signatory->status = $data['status'];
            $signatory->updated_by = Auth::id();
        }
        $signatory->voucher_type = $data['voucher_type'];
        $signatory->signatory_name = $data['signatory_name'];
        $signatory->order_qty = $data['order_qty'];
        $signatory->save();

        return $signatory;
    }
}
