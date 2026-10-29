<?php

namespace App\Services\softConfig;

use App\Models\softConfig\PpSpSetup;

class PpSpSetupService
{
    public function getSetups(array $filters = [], $perPage = null)
    {
        $query = PpSpSetup::query();

        // Handle status / trash logic
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        } else {
            $query->withTrashed();
        }

        $query
            ->when($filters['type'] ?? null, fn($q, $type) => $q->where('type', $type))
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")))
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt))));

        $query->with('createdBy:id,name')->orderByDesc('id');

        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    public function createSetup(array $data)
    {
        $data['status'] = $data['status'] ?? 1;
        $setup = PpSpSetup::create($data);
        $this->keepOnlyOneActive($setup);
        return $setup;
    }

    public function updateSetup(PpSpSetup $setup, array $data)
    {
        $setup->update($data);
        $this->keepOnlyOneActive($setup);
        return $setup;
    }

    // Only one setup per type can be active, so turn the others off
    private function keepOnlyOneActive(PpSpSetup $setup)
    {
        if ($setup->status == 1) {
            PpSpSetup::where('type', $setup->type)
                ->where('id', '!=', $setup->id)
                ->update(['status' => 0]);
        }
    }

    public function softDeleteSetup(PpSpSetup $setup)
    {
        $setup->delete();
    }

    public function restoreSetup(PpSpSetup $setup)
    {
        if ($setup->trashed()) {
            $setup->restore();
            $this->keepOnlyOneActive($setup);
        }
        return $setup;
    }

    public function forceDeleteSetup(PpSpSetup $setup)
    {
        if ($setup->trashed()) {
            $setup->forceDelete();
            return true;
        }
        return false;
    }
}
