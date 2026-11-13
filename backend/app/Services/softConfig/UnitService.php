<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Unit;

class UnitService
{
    const defaultColumns = [
        'id',
        'name',
        'code',
        'status',
        'created_by',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    // Unit list with the search filters; paginated when perPage is given
    public function getUnits(array $filters = [], $perPage = null, $columns = self::defaultColumns)
    {
        $query = Unit::query()->select($columns);

        // status "trash" shows the deleted units, any other status filters by it
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the unit
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with(['createdBy:id,name'])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    public function createUnit(array $data)
    {
        return Unit::create($data);
    }

    public function updateUnit(Unit $unit, array $data)
    {
        $unit->update($data);
        return $unit;
    }

    public function softDeleteUnit(Unit $unit)
    {
        $unit->delete();
    }

    public function restoreUnit(Unit $unit)
    {
        if ($unit->trashed()) {
            $unit->restore();
        }
        return $unit;
    }

    // only a unit in the trash can be deleted for ever
    public function forceDeleteUnit(Unit $unit)
    {
        if ($unit->trashed()) {
            $unit->forceDelete();
            return true;
        }
        return false;
    }
}
