<?php

namespace App\Services\accounting;

use App\Models\accounting\CostCategory;
use App\Models\accounting\CostCenter;
use Illuminate\Support\Facades\Auth;

// Cost Category and Cost Center setup (parts_bazar accounting/costCategory and costCenter)
class CostCenterService
{
    // ---------- Cost Category ----------

    public function getCategories(array $filters)
    {
        $query = CostCategory::query()->with(['createdBy:id,name', 'updatedBy:id,name']);

        if (!empty($filters['title'])) {
            $query->where('title', 'like', '%' . $filters['title'] . '%');
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('title')->get();
    }

    // active categories for the Cost Center form, like parts_bazar (status=1, title ASC)
    public function categoryOptions()
    {
        $rows = CostCategory::where('status', CostCategory::ACTIVE)->orderBy('title')->get(['id', 'title']);
        $list = [];
        foreach ($rows as $row) {
            $list[] = ['value' => (string) $row->id, 'label' => $row->title];
        }
        return $list;
    }

    public function saveCategory(array $data, $category = null)
    {
        if (!$category) {
            $category = new CostCategory();
            $category->status = CostCategory::ACTIVE;
            $category->created_by = Auth::id();
        } else {
            // status is only on the update form, like parts_bazar
            $category->status = $data['status'];
            $category->updated_by = Auth::id();
        }
        $category->title = $data['title'];
        $category->save();

        return $category;
    }

    // ---------- Cost Center ----------

    public function getCenters(array $filters)
    {
        $query = CostCenter::query()->with(['costCategory:id,title', 'createdBy:id,name', 'updatedBy:id,name']);

        if (!empty($filters['cost_category_id'])) {
            $query->where('cost_category_id', $filters['cost_category_id']);
        }
        if (!empty($filters['title'])) {
            $query->where('title', 'like', '%' . $filters['title'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('title')->get();
    }

    // active cost centers as "title (code)", for the voucher line
    public function centerOptions()
    {
        $rows = CostCenter::where('status', CostCenter::ACTIVE)->orderBy('title')->get();
        $list = [];
        foreach ($rows as $row) {
            $list[] = ['value' => $row->id, 'label' => $row->titleWithCode()];
        }
        return $list;
    }

    public function saveCenter(array $data, $center = null)
    {
        if (!$center) {
            $center = new CostCenter();
            $center->status = CostCenter::ACTIVE;
            $center->created_by = Auth::id();
        } else {
            $center->status = $data['status'];
            $center->updated_by = Auth::id();
        }
        $center->cost_category_id = $data['cost_category_id'];
        $center->title = $data['title'];
        $center->code = $data['code'] ?? null;
        $center->save();

        return $center;
    }
}
