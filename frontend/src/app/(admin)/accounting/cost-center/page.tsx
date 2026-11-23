"use client";
// Cost Center, like parts_bazar accounting/costCenter:
// a cost center belongs to a cost category, a voucher line can be tagged with it.
// Add and update only, status is set on update.
import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEdit } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import { formatDateTime } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { accountingSetupService, COST_STATUS, CostCenter, CostCenterPayload, Option } from "@/services/accountingSetupService";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function emptyForm(): CostCenterPayload {
  return { cost_category_id: "", title: "", code: "", status: "1" };
}

export default function CostCenterPage() {
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState<CostCenter[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [form, setForm] = useState<CostCenterPayload>(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountingSetupService.getCostCenters(filters);
      setRows(res.data);
      setCategories(res.categories);
    } catch {
      toast.error("Failed to load the cost centers");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Cost Center | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  // the category list has only active ones, an inactive category of an old cost center is added
  // so the update form still shows it
  function categoryOptions(): Option[] {
    if (!editing || !editing.cost_category) {
      return categories;
    }
    const value = String(editing.cost_category_id);
    for (const category of categories) {
      if (category.value === value) {
        return categories;
      }
    }
    return [...categories, { value: value, label: editing.cost_category.title + " (Inactive)" }];
  }

  function openForm(row: CostCenter | null) {
    setEditing(row);
    setError("");
    if (row) {
      let code = "";
      if (row.code) {
        code = row.code;
      }
      setForm({ cost_category_id: String(row.cost_category_id), title: row.title, code: code, status: String(row.status) });
    } else {
      setForm(emptyForm());
    }
    setModalOpen(true);
  }

  async function save() {
    setError("");
    if (!form.cost_category_id) {
      setError("Cost Category cannot be blank.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title cannot be blank.");
      return;
    }
    if (form.title.trim().length > 255) {
      setError("Title is too long (maximum is 255 characters).");
      return;
    }
    if (form.code.trim().length > 100) {
      setError("Code is too long (maximum is 100 characters).");
      return;
    }

    const data: CostCenterPayload = { cost_category_id: form.cost_category_id, title: form.title.trim(), code: form.code.trim(), status: form.status };
    try {
      setSaving(true);
      if (editing) {
        await accountingSetupService.saveCostCenter(data, editing.id);
        toast.success("successfully updated");
      } else {
        await accountingSetupService.saveCostCenter(data);
        toast.success("Data saved successfully.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<CostCenter>[] = [
    {
      id: "cost_category_id",
      accessorKey: "cost_category_id",
      header: "Cost Category",
      meta: { filterVariant: "select", filterOptions: categories, widthClass: "w-[180px]" },
      cell: ({ row }) => {
        if (row.original.cost_category) {
          return row.original.cost_category.title;
        }
        return "";
      },
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      meta: { filterVariant: "text" },
      cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.title}</span>,
    },
    {
      id: "code",
      accessorKey: "code",
      header: "Code",
      meta: { filterVariant: "text", widthClass: "w-[140px]" },
      cell: ({ row }) => row.original.code,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { filterVariant: "select", filterOptions: COST_STATUS, widthClass: "w-[120px]" },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "created_by",
      header: "Created By",
      meta: { filterVariant: "none", widthClass: "w-[150px]" },
      cell: ({ row }) => {
        if (row.original.created_by) {
          return row.original.created_by.name;
        }
        return "";
      },
    },
    {
      id: "created_at",
      header: "Created At",
      meta: { filterVariant: "none", widthClass: "w-[160px]" },
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[80px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Update", show: () => hasPermission("cost-center.edit"), onClick: () => openForm(row.original) },
          ]}
        />
      ),
    },
  ];

  let modalTitle = "Add New Cost Center";
  let saveLabel = "Save";
  if (editing) {
    modalTitle = "Update Cost Center";
    saveLabel = "Update";
  }
  if (saving) {
    saveLabel = "Saving...";
  }

  return (
    <AccessRoute requiredPermissions={["cost-center.view", "cost-center.create", "cost-center.edit"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Cost Center" }]} />
        <ComponentCard
          title="Cost Center"
          desc="A voucher line can be tagged with an active cost center to see the expense of each center."
          showAddButton={hasPermission("cost-center.create")}
          buttonLabel="Add New Cost Center"
          openModal={() => openForm(null)}
        >
          <DataTable columns={columns} data={rows} onColumnFilterChange={handleFilterChange} total={rows.length} loading={loading} exportFilename="cost-center" />
        </ComponentCard>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          className="max-w-md"
          title={modalTitle}
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>{saveLabel}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
            )}
            <div>
              <Label required>Cost Category</Label>
              <ReactSelect options={categoryOptions()} value={form.cost_category_id || null} placeholder="Select" onChange={(value) => setForm({ ...form, cost_category_id: value ? String(value) : "" })} />
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">No active cost category yet, add one from Cost Category first.</p>
              )}
            </div>
            <div>
              <Label required>Title</Label>
              <input type="text" value={form.title} maxLength={255} placeholder="e.g. Dhaka Branch" onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label>Code</Label>
              <input type="text" value={form.code} maxLength={100} placeholder="e.g. DHK-01" onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputClass} />
            </div>
            {editing && (
              <div>
                <Label required>Status</Label>
                <ReactSelect options={COST_STATUS} value={form.status} isClearable={false} onChange={(value) => setForm({ ...form, status: value ? String(value) : "1" })} />
              </div>
            )}
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
