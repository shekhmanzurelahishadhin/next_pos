"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEdit, FiEye, FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { inventoryAuditService, InventoryAuditRow } from "@/services/inventoryAuditService";
import { InventoryAuditViewModal } from "../components/InventoryAuditView";

type Option = { value: string; label: string };

// parts_bazar inventoryAudit/admin with the counts added: one row per audit
export default function InventoryAuditManage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<InventoryAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Option[]>([]);
  const [auditNames, setAuditNames] = useState<Option[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [viewId, setViewId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryAuditService.getAudits({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load inventory audits");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Inventory Audit Manage | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => {});
    inventoryAuditService.getAuditNames({ per_page: 200 })
      .then((res) => setAuditNames(res.data.map((n) => ({ value: String(n.id), label: n.audit_name }))))
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const remove = useCallback(async (row: InventoryAuditRow) => {
    const result = await confirm({ title: "Delete Audit?", text: `Delete audit ${row.entry_no} with all its counts?` });
    if (!result.isConfirmed) return;
    try {
      await inventoryAuditService.deleteAudit(row.id);
      toast.success(`${row.entry_no} deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete audit");
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<InventoryAuditRow>[] => [
    {
      id: "entry_no",
      accessorKey: "entry_no",
      header: "Entry No",
      meta: { filterVariant: "text", widthClass: "w-[110px]" },
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-gray-800 dark:text-white/90">{row.original.entry_no}</div>
          <div className="text-xs text-gray-400">{formatDate(row.original.created_at)}</div>
        </div>
      ),
    },
    {
      id: "audit_name_id",
      accessorKey: "audit_name",
      header: "Audit Name",
      meta: { filterVariant: "searchSelect", filterOptions: auditNames, widthClass: "min-w-[150px]" },
      cell: ({ row }) => row.original.audit_name,
    },
    {
      id: "store_id",
      accessorKey: "store_name",
      header: "Store",
      meta: { filterVariant: "searchSelect", filterOptions: stores, widthClass: "min-w-[150px]" },
      cell: ({ row }) => row.original.store_name,
    },
    {
      id: "location_name",
      accessorKey: "location_name",
      header: "Location",
      meta: { filterVariant: "text", widthClass: "w-[130px]" },
      cell: ({ row }) => row.original.location_name,
    },
    {
      id: "items",
      header: "Items",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => <span className="block text-right">{row.original.items}</span>,
    },
    {
      id: "erp_qty",
      header: "ERP Qty",
      meta: { filterVariant: "none", widthClass: "w-[80px]" },
      cell: ({ row }) => <span className="block text-right">{Number(row.original.erp_qty)}</span>,
    },
    {
      id: "physical_qty",
      header: "Physical Qty",
      meta: { filterVariant: "none", widthClass: "w-[90px]" },
      cell: ({ row }) => <span className="block text-right">{Number(row.original.physical_qty)}</span>,
    },
    {
      id: "result",
      header: "Result",
      meta: { filterVariant: "none", widthClass: "w-[120px]" },
      cell: ({ row }) =>
        Number(row.original.mismatch) === 0 ? (
          <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">All matched</span>
        ) : (
          <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-medium text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {row.original.mismatch} mismatch
          </span>
        ),
    },
    {
      id: "created_by_name",
      accessorKey: "created_by_name",
      header: "Created By",
      meta: { filterVariant: "text", widthClass: "w-[120px]" },
      cell: ({ row }) => row.original.created_by_name,
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[110px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print", onClick: () => setViewId(row.original.id) },
            {
              icon: FiEdit, variant: "primary", size: "sm", tooltip: "Edit (continue counting)",
              show: () => hasPermission("inventory-audit.edit"),
              onClick: () => router.push(`/inventory/audit?id=${row.original.id}`),
            },
            {
              icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
              show: () => hasPermission("inventory-audit.delete"),
              onClick: () => remove(row.original),
            },
          ]}
        />
      ),
    },
  ], [stores, auditNames, hasPermission, remove, router]);

  return (
    <AccessRoute requiredPermissions={["inventory-audit.view", "inventory-audit.create", "inventory-audit.edit", "inventory-audit.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Inventory Audit Manage" }]} />
        <ComponentCard
          title="Inventory Audit Manage"
          desc="Counted locations with the ERP qty, the physical qty and how many barcodes do not match. Stock is not changed by an audit."
          showAddButton={hasPermission("inventory-audit.create")}
          buttonLabel="New Audit"
          openModal={() => router.push("/inventory/audit")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="inventory-audits"
          />
        </ComponentCard>
        <InventoryAuditViewModal auditId={viewId} onClose={() => setViewId(null)} />
      </div>
    </AccessRoute>
  );
}
