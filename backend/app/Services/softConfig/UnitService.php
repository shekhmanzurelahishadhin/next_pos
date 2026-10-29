<?php


namespace App\Services\softConfig;


use App\Models\softConfig\Unit;
use Illuminate\Support\Facades\Auth;

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
    public function getUnits(array $filters = [], $perPage = null, $columns = self::defaultColumns)
    {
        $query = Unit::query()->select($columns);

        // Handle status / trash logic
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        // Apply filters
        $query
            ->when($filters['name'] ?? null, fn($q, $name) => $q->where('name', 'like', "%{$name}%"))
            ->when($filters['code'] ?? null, fn($q, $code) => $q->where('code', 'like', "%{$code}%"))
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")))
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt))));

        // Eager load common relations
        $query->with([
            'createdBy:id,name'
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }


    public function createUnit(array $data)
    {
        return Unit::create($data);
    }

    public function updateUnit(Unit $unit, array $data)
    {
        $unit->update($data); // updates the model
        return $unit;         // return the model itself
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

    public function forceDeleteUnit(Unit $unit)
    {
        if ($unit->trashed()) {
            $unit->forceDelete();
            return true;
        }
        return false;
    }
}
