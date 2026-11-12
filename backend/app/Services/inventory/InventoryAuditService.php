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
        $query = AuditName::query()->withCount('audits');

        if (!empty($filters['audit_name'])) {
            $query->where('audit_name', 'like', '%' . $filters['audit_name'] . '%');
        }
        // status 0 (Inactive) is a real value, so only an empty status means "all"
        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    // Active audit names for the entry form
    public function activeAuditNames(): array
    {
        return AuditName::where('status', AuditName::ACTIVE)
            ->orderBy('audit_name')
            ->get(['id', 'audit_name', 'from_date', 'to_date'])
            ->all();
    }

    // create a new audit name, or update the one given
    public function saveAuditName(array $data, ?AuditName $auditName = null): AuditName
    {
        if ($auditName) {
            $data['updated_by'] = Auth::id();
            $auditName->update($data);
            return $auditName;
        }

        $data['created_by'] = Auth::id();
        return AuditName::create($data);
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
        $barcodes = InventoryBarcode::with('product:id,name,part_number', 'location:id,name')
            ->where('store_id', $storeId)
            ->where('location_id', $locationId)
            ->whereRaw('stock_in - stock_out > 0')
            ->orderBy('product_id')
            ->get();

        $lines = [];
        foreach ($barcodes as $row) {
            $lines[] = $this->barcodeLine($row);
        }

        return $lines;
    }

    public function createAudit(array $data): InventoryAudit
    {
        $this->checkHeader($data);

        DB::beginTransaction();
        try {
            // lock the table, so two users never get the same number
            $maxSlNo = (int) InventoryAudit::lockForUpdate()->max('max_sl_no') + 1;

            $audit = InventoryAudit::create([
                'max_sl_no'     => $maxSlNo,
                // parts_bazar entry no: 5 digit serial / year, like 00003/2026
                'entry_no'      => str_pad((string) $maxSlNo, 5, '0', STR_PAD_LEFT) . '/' . date('Y'),
                'audit_name_id' => $data['audit_name_id'],
                'company_id'    => Store::find($data['store_id'])->company_id,
                'store_id'      => $data['store_id'],
                'location_id'   => $data['location_id'],
                'remarks'       => $data['remarks'] ?? null,
                'created_by'    => Auth::id(),
            ]);
            $this->saveDetails($audit, $data['items']);

            DB::commit();
            return $audit;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Edit = continue counting: the header stays, the lines are replaced
    public function updateAudit(InventoryAudit $audit, array $data): InventoryAudit
    {
        $this->checkHeader($data);

        DB::beginTransaction();
        try {
            $audit->update([
                'audit_name_id' => $data['audit_name_id'],
                'location_id'   => $data['location_id'],
                'remarks'       => $data['remarks'] ?? null,
                'updated_by'    => Auth::id(),
            ]);
            $audit->details()->delete();
            $this->saveDetails($audit, $data['items']);

            DB::commit();
            return $audit;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Inventory Audit Manage: one row per audit with its totals
    public function getAuditRows(array $filters = [], $perPage = 10)
    {
        $query = DB::table('inventory_audits')
            ->join('audit_names', 'audit_names.id', '=', 'inventory_audits.audit_name_id')
            ->leftJoin('stores', 'stores.id', '=', 'inventory_audits.store_id')
            ->leftJoin('locations', 'locations.id', '=', 'inventory_audits.location_id')
            ->leftJoin('users', 'users.id', '=', 'inventory_audits.created_by')
            ->leftJoin('inventory_audit_details', 'inventory_audit_details.inventory_audit_id', '=', 'inventory_audits.id')
            ->groupBy(
                'inventory_audits.id',
                'inventory_audits.entry_no',
                'inventory_audits.store_id',
                'inventory_audits.created_at',
                'audit_names.audit_name',
                'stores.name',
                'locations.name',
                'users.name'
            )
            ->select(
                'inventory_audits.id',
                'inventory_audits.entry_no',
                'inventory_audits.store_id',
                'inventory_audits.created_at',
                'audit_names.audit_name',
                'stores.name as store_name',
                'locations.name as location_name',
                'users.name as created_by_name'
            )
            ->selectRaw('COUNT(inventory_audit_details.id) as items')
            ->selectRaw('COALESCE(SUM(inventory_audit_details.erp_qty), 0) as erp_qty')
            ->selectRaw('COALESCE(SUM(inventory_audit_details.physical_qty), 0) as physical_qty')
            // how many lines where the counted qty is not the ERP qty
            ->selectRaw('COALESCE(SUM(inventory_audit_details.physical_qty <> inventory_audit_details.erp_qty), 0) as mismatch');

        $this->onlyOwnCompany($query);

        if (!empty($filters['entry_no'])) {
            $query->where('inventory_audits.entry_no', 'like', '%' . $filters['entry_no'] . '%');
        }
        if (!empty($filters['audit_name_id'])) {
            $query->where('inventory_audits.audit_name_id', $filters['audit_name_id']);
        }
        if (!empty($filters['store_id'])) {
            $query->where('inventory_audits.store_id', $filters['store_id']);
        }
        if (!empty($filters['location_name'])) {
            $query->where('locations.name', 'like', '%' . $filters['location_name'] . '%');
        }
        if (!empty($filters['created_by_name'])) {
            $query->where('users.name', 'like', '%' . $filters['created_by_name'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }

        return $query->orderByDesc('inventory_audits.id')->paginate($perPage);
    }

    public function getAudit(int $id): InventoryAudit
    {
        $query = InventoryAudit::with([
            'details.product:id,name,part_number',
            'details.location:id,name',
            'auditName:id,audit_name,from_date,to_date',
            'store:id,name',
            'location:id,name',
            'company:id,name,address,phone',
            'createdBy:id,name',
        ]);
        $this->onlyOwnCompany($query);

        return $query->findOrFail($id);
    }

    public function deleteAudit(InventoryAudit $audit): void
    {
        $audit->delete(); // the details go with it (cascade)
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
        $nameIsActive = AuditName::where('id', $data['audit_name_id'])->where('status', AuditName::ACTIVE)->exists();
        if (!$nameIsActive) {
            throw new \RuntimeException('This audit name is not active.');
        }

        $locationInStore = Location::where('id', $data['location_id'])->where('store_id', $data['store_id'])->exists();
        if (!$locationInStore) {
            throw new \RuntimeException('Location is not in this store.');
        }

        // one barcode only once in the list
        $seen = [];
        foreach ($data['items'] as $item) {
            if (in_array($item['barcode'], $seen)) {
                throw new \RuntimeException('A barcode is in the list twice.');
            }
            $seen[] = $item['barcode'];
        }
    }

    // one barcode as a line of the audit form
    private function barcodeLine(InventoryBarcode $row): array
    {
        return [
            'barcode'       => $row->barcode,
            'product_id'    => $row->product_id,
            'product_name'  => $row->product ? $row->product->name : null,
            'part_number'   => $row->product ? $row->product->part_number : null,
            'location_id'   => $row->location_id,
            'location_name' => $row->location ? $row->location->name : null,
            'erp_qty'       => InventoryBarcode::closingStock($row->barcode),
        ];
    }

    // a company user can only see the audits of own company
    private function onlyOwnCompany($query): void
    {
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            $query->where('inventory_audits.company_id', $user->company_id);
        }
    }
}
