<?php

namespace App\Services\softConfig;

use App\Models\softConfig\PpSpSetup;

class PpSpSetupService
{
    // PP/SP setup list with the search filters; paginated when perPage is given
    public function getSetups(array $filters = [], $perPage = null)
    {
        $query = PpSpSetup::query();

        // status "trash" shows only the deleted setups, a status filters by it,
        // no status shows all (deleted ones too)
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        } else {
            $query->withTrashed();
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the setup
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with('createdBy:id,name')->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
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
