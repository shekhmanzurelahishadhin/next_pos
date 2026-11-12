"use client";
// Audit Name Setup, like parts_bazar auditNameSetup: the audit periods counts are made under
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEdit, FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import { formatDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { inventoryAuditService, AuditName, AuditNamePayload } from "@/services/inventoryAuditService";

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function emptyForm(): AuditNamePayload {
  return { audit_name: "", from_date: "", to_date: "", status: 1 };
}

export default function AuditNameSetup() {
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<AuditName[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const [editing, setEditing] = useState<AuditName | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AuditNamePayload>(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryAuditService.getAuditNames({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load audit names");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Audit Name Setup | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const openForm = useCallback((row: AuditName | null) => {
    setEditing(row);
    if (row) {
      setForm({ audit_name: row.audit_name, from_date: row.from_date, to_date: row.to_date, status: Number(row.status ?? 1) });
    } else {
      setForm(emptyForm());
    }
    setError("");
    setModalOpen(true);
  }, []);

  // stable functions, so the date pickers are not rebuilt on every render
  const changeFrom = useCallback((_dates: Date[], value: string) => {
    setForm((oldForm) => ({ ...oldForm, from_date: value }));
  }, []);
  const changeTo = useCallback((_dates: Date[], value: string) => {
    setForm((oldForm) => ({ ...oldForm, to_date: value }));
  }, []);

  function changeName(value: string) {
    setForm({ ...form, audit_name: value });
  }

  function changeStatus(value: string | number | null) {
    setForm({ ...form, status: value ? Number(value) : 1 });
  }

  async function save() {
    if (!form.audit_name.trim()) {
      setError("Audit Name cannot be blank.");
      return;
    }
    if (!form.from_date) {
      setError("From Date cannot be blank.");
      return;
    }
    if (!form.to_date) {
      setError("To Date cannot be blank.");
      return;
    }
    if (form.to_date < form.from_date) {
      setError("To Date can not be before From Date.");
      return;
    }

    try {
      setSaving(true);
      await inventoryAuditService.saveAuditName({ ...form, audit_name: form.audit_name.trim() }, editing?.id);
      toast.success(editing ? "Audit name updated" : "Audit name saved");
      setModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  const remove = useCallback(async (row: AuditName) => {
    const result = await confirm({ title: "Delete Audit Name?", text: `Delete "${row.audit_name}"?` });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await inventoryAuditService.deleteAuditName(row.id);
      toast.success("Audit name deleted");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete audit name"));
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<AuditName>[] => [
    {
      id: "audit_name",
      accessorKey: "audit_name",
      header: "Audit Name",
      meta: { filterVariant: "text", widthClass: "min-w-[200px]" },
      cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.audit_name}</span>,
    },
    {
      id: "from_date",
      header: "From Date",
      meta: { filterVariant: "none", widthClass: "w-[120px]" },
      cell: ({ row }) => formatDate(row.original.from_date),
    },
    {
      id: "to_date",
      header: "To Date",
      meta: { filterVariant: "none", widthClass: "w-[120px]" },
      cell: ({ row }) => formatDate(row.original.to_date),
    },
    {
      id: "audits_count",
      header: "Audit Entries",
      meta: { filterVariant: "none", widthClass: "w-[110px]" },
      cell: ({ row }) => <span className="block text-right">{row.original.audits_count ?? 0}</span>,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { filterVariant: "select", filterOptions: STATUS_OPTIONS, widthClass: "w-[100px]" },
      cell: ({ row }) =>
        Number(row.original.status) === 1 ? (
          <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">Active</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400">Inactive</span>
        ),
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[90px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Edit", show: () => hasPermission("audit-name.edit"), onClick: () => openForm(row.original) },
            {
              icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
              show: () => hasPermission("audit-name.delete") && !row.original.audits_count,
              onClick: () => remove(row.original),
            },
          ]}
        />
      ),
    },
  ], [hasPermission, openForm, remove]);

  return (
    <AccessRoute requiredPermissions={["audit-name.view", "audit-name.create", "audit-name.edit", "audit-name.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Audit Name Setup" }]} />
        <ComponentCard
          title="Audit Name Setup"
          desc="An audit period, e.g. Nov-2026 Audit. Only active names can be picked on Inventory Audit Entry."
          showAddButton={hasPermission("audit-name.create")}
          buttonLabel="New Audit Name"
          openModal={() => openForm(null)}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="audit-names"
          />
        </ComponentCard>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          className="max-w-md"
          title={editing ? "Edit Audit Name" : "New Audit Name"}
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </>
          }
        >
          {/* key: fresh date pickers each time the modal opens */}
          <div key={`${editing?.id ?? "new"}-${modalOpen}`} className="space-y-4">
            {error && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
            )}
            <div>
              <Label required>Audit Name</Label>
              <input
                type="text"
                value={form.audit_name}
                maxLength={255}
                placeholder="e.g. Nov-2026 Audit"
                onChange={(e) => changeName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>From Date</Label>
                <DatePicker id="audit_from_date" defaultDate={form.from_date || undefined} onChange={changeFrom} placeholder="Select date" />
              </div>
              <div>
                <Label required>To Date</Label>
                <DatePicker id="audit_to_date" defaultDate={form.to_date || undefined} onChange={changeTo} placeholder="Select date" />
              </div>
            </div>
            <div>
              <Label required>Status</Label>
              <ReactSelect options={STATUS_OPTIONS} value={String(form.status)} isClearable={false} onChange={changeStatus} />
            </div>
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
