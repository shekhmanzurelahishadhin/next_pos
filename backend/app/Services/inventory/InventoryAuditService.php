<?php

namespace App\Services\inventory;

use App\Models\inventory\AuditName;
use App\Models\inventory\InventoryAudit;
use App\Models\inventory\InventoryAuditDetail;
use App\Models\inventory\InventoryBarcode;
use App\Models\softConfig\Location;
use App\Models\softConfig\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryAuditService
{
    // ---------- Audit Name Setup ----------

    public function getAuditNames(array $filters = [], $perPage = 10)
    {
        return AuditName::query()
            ->when($filters['audit_name'] ?? null, fn($q, $v) => $q->where('audit_name', 'like', "%{$v}%"))
            ->when(isset($filters['status']) && $filters['status'] !== '', fn($q) => $q->where('status', $filters['status']))
            ->withCount('audits')
            ->orderByDesc('id')
            ->paginate($perPage ?: 10);
    }

    // Active audit names for the entry form
    public function activeAuditNames(): array
    {
        return AuditName::where('status', AuditName::ACTIVE)->orderBy('audit_name')
            ->get(['id', 'audit_name', 'from_date', 'to_date'])->all();
    }

    public function saveAuditName(array $data, ?AuditName $auditName = null): AuditName
    {
        if ($auditName) {
            $auditName->update($data + ['updated_by' => Auth::id()]);
            return $auditName;
        }
        return AuditName::create($data + ['created_by' => Auth::id()]);
    }

    public function deleteAuditName(AuditName $auditName): void
    {
        if (InventoryAudit::where('audit_name_id', $auditName->id)->exists()) {
            throw new \RuntimeException('This audit name has audit entries and can not be deleted. Make it inactive instead.');
        }
        $auditName->delete();
    }

    // ---------- Audit Entry ----------

    // Scan: the barcode must be in the audited store; its ERP qty is the barcode stock
    public function scanBarcode(string $barcode, int $storeId): array
    {
        $row = InventoryBarcode::with('product:id,name,part_number', 'location:id,name')
            ->where('barcode', $barcode)
            ->where('store_id', $storeId)
            ->first();
        if (!$row) {
            throw new \RuntimeException("Product not found with this barcode ({$barcode}) in this store.");
        }
        return $this->barcodeLine($row);
    }

    // What the ERP says is in a location, to show the barcodes not scanned yet
    public function locationStock(int $storeId, int $locationId): array
    {
        return InventoryBarcode::with('product:id,name,part_number', 'location:id,name')
            ->where('store_id', $storeId)
            ->where('location_id', $locationId)
            ->whereRaw('stock_in - stock_out > 0')
            ->orderBy('product_id')
            ->get()
            ->map(fn($row) => $this->barcodeLine($row))
            ->all();
    }

    public function createAudit(array $data): InventoryAudit
    {
        $this->checkHeader($data);

        return DB::transaction(function () use ($data) {
            $maxSlNo = (int) InventoryAudit::lockForUpdate()->max('max_sl_no') + 1;
            $audit = InventoryAudit::create([
                'max_sl_no'     => $maxSlNo,
                // parts_bazar entry no: 5 digit serial / year
                'entry_no'      => str_pad((string) $maxSlNo, 5, '0', STR_PAD_LEFT) . '/' . date('Y'),
                'audit_name_id' => $data['audit_name_id'],
                'company_id'    => Store::find($data['store_id'])->company_id,
                'store_id'      => $data['store_id'],
                'location_id'   => $data['location_id'],
                'remarks'       => $data['remarks'] ?? null,
                'created_by'    => Auth::id(),
            ]);
            $this->saveDetails($audit, $data['items']);
            return $audit;
        });
    }

    // Edit = continue counting: header stays, the lines are replaced
    public function updateAudit(InventoryAudit $audit, array $data): InventoryAudit
    {
        $this->checkHeader($data);

        return DB::transaction(function () use ($audit, $data) {
            $audit->update([
                'audit_name_id' => $data['audit_name_id'],
                'location_id'   => $data['location_id'],
                'remarks'       => $data['remarks'] ?? null,
                'updated_by'    => Auth::id(),
            ]);
            $audit->details()->delete();
            $this->saveDetails($audit, $data['items']);
            return $audit;
        });
    }

    // Inventory Audit Manage: one row per audit with its totals
    public function getAuditRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('inventory_audits as a')
            ->join('audit_names as n', 'n.id', '=', 'a.audit_name_id')
            ->leftJoin('stores as s', 's.id', '=', 'a.store_id')
            ->leftJoin('locations as l', 'l.id', '=', 'a.location_id')
            ->leftJoin('users as u', 'u.id', '=', 'a.created_by')
            ->leftJoin('inventory_audit_details as d', 'd.inventory_audit_id', '=', 'a.id')
            ->groupBy('a.id', 'a.entry_no', 'a.store_id', 'a.created_at', 'n.audit_name', 's.name', 'l.name', 'u.name')
            ->select(
                'a.id', 'a.entry_no', 'a.store_id', 'a.created_at', 'n.audit_name',
                's.name as store_name', 'l.name as location_name', 'u.name as created_by_name',
                DB::raw('COUNT(d.id) as items'),
                DB::raw('COALESCE(SUM(d.erp_qty), 0) as erp_qty'),
                DB::raw('COALESCE(SUM(d.physical_qty), 0) as physical_qty'),
                DB::raw('COALESCE(SUM(d.physical_qty <> d.erp_qty), 0) as mismatch')
            );

        $this->onlyOwnCompany($query, 'a');

        $query
            ->when($filters['entry_no'] ?? null, fn($q, $v) => $q->where('a.entry_no', 'like', "%{$v}%"))
            ->when($filters['audit_name_id'] ?? null, fn($q, $v) => $q->where('a.audit_name_id', $v))
            ->when($filters['store_id'] ?? null, fn($q, $v) => $q->where('a.store_id', $v))
            ->when($filters['location_name'] ?? null, fn($q, $v) => $q->where('l.name', 'like', "%{$v}%"))
            ->when($filters['created_by_name'] ?? null, fn($q, $v) => $q->where('u.name', 'like', "%{$v}%"));

        return $query->orderByDesc('a.id')->paginate($perPage ?: 10);
    }

    public function getAudit(int $id): InventoryAudit
    {
        $query = InventoryAudit::with([
            'details.product:id,name,part_number', 'details.location:id,name',
            'auditName:id,audit_name,from_date,to_date', 'store:id,name', 'location:id,name',
            'company:id,name,address,phone', 'createdBy:id,name',
        ]);
        $this->onlyOwnCompany($query, 'inventory_audits');
        return $query->findOrFail($id);
    }

    public function deleteAudit(InventoryAudit $audit): void
    {
        $audit->delete(); // details go with it (cascade)
    }

    private function saveDetails(InventoryAudit $audit, array $items): void
    {
        foreach ($items as $item) {
            $barcode = InventoryBarcode::where('barcode', $item['barcode'])->where('store_id', $audit->store_id)->first();
            if (!$barcode) {
                throw new \RuntimeException("Product not found with this barcode ({$item['barcode']}) in this store.");
            }
            InventoryAuditDetail::create([
                'inventory_audit_id' => $audit->id,
                'product_id'         => $barcode->product_id,
                'barcode'            => $barcode->barcode,
                'location_id'        => $barcode->location_id,
                'erp_qty'            => InventoryBarcode::closingStock($barcode->barcode),
                'physical_qty'       => $item['physical_qty'],
            ]);
        }
    }

    private function checkHeader(array $data): void
    {
        if (!AuditName::where('id', $data['audit_name_id'])->where('status', AuditName::ACTIVE)->exists()) {
            throw new \RuntimeException('This audit name is not active.');
        }
        if (!Location::where('id', $data['location_id'])->where('store_id', $data['store_id'])->exists()) {
            throw new \RuntimeException('Location is not in this store.');
        }
        $barcodes = array_column($data['items'], 'barcode');
        if (count($barcodes) !== count(array_unique($barcodes))) {
            throw new \RuntimeException('A barcode is in the list twice.');
        }
    }

    private function barcodeLine(InventoryBarcode $row): array
    {
        return [
            'barcode'       => $row->barcode,
            'product_id'    => $row->product_id,
            'product_name'  => $row->product?->name,
            'part_number'   => $row->product?->part_number,
            'location_id'   => $row->location_id,
            'location_name' => $row->location?->name,
            'erp_qty'       => InventoryBarcode::closingStock($row->barcode),
        ];
    }

    private function onlyOwnCompany($query, string $alias): void
    {
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where("{$alias}.company_id", Auth::user()->company_id);
        }
    }
}
