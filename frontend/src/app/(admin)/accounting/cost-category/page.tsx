"use client";
// Cost Category, like parts_bazar accounting/costCategory:
// a group of cost centers. Add and update only, status is set on update.
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
import { accountingSetupService, COST_STATUS, CostCategory } from "@/services/accountingSetupService";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function CostCategoryPage() {
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostCategory | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("1");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await accountingSetupService.getCostCategories(filters);
      setRows(list);
    } catch {
      toast.error("Failed to load the cost categories");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Cost Category | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  function openForm(row: CostCategory | null) {
    setEditing(row);
    setError("");
    if (row) {
      setTitle(row.title);
      setStatus(String(row.status));
    } else {
      setTitle("");
      setStatus("1");
    }
    setModalOpen(true);
  }

  async function save() {
    setError("");
    if (!title.trim()) {
      setError("Title cannot be blank.");
      return;
    }
    if (title.trim().length > 255) {
      setError("Title is too long (maximum is 255 characters).");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await accountingSetupService.saveCostCategory({ title: title.trim(), status: status }, editing.id);
        toast.success("successfully updated");
      } else {
        await accountingSetupService.saveCostCategory({ title: title.trim(), status: status });
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

  const columns: ColumnDef<CostCategory>[] = [
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      meta: { filterVariant: "text" },
      cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.title}</span>,
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
      id: "updated_by",
      header: "Updated By",
      meta: { filterVariant: "none", widthClass: "w-[150px]" },
      cell: ({ row }) => {
        if (row.original.updated_by) {
          return row.original.updated_by.name;
        }
        return "";
      },
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[80px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Update", show: () => hasPermission("cost-category.edit"), onClick: () => openForm(row.original) },
          ]}
        />
      ),
    },
  ];

  let modalTitle = "Add New Cost Category";
  let saveLabel = "Save";
  if (editing) {
    modalTitle = "Update Cost Category";
    saveLabel = "Update";
  }
  if (saving) {
    saveLabel = "Saving...";
  }

  return (
    <AccessRoute requiredPermissions={["cost-category.view", "cost-category.create", "cost-category.edit"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Cost Category" }]} />
        <ComponentCard
          title="Cost Category"
          desc="Group of cost centers. Only an active category can be picked for a new cost center."
          showAddButton={hasPermission("cost-category.create")}
          buttonLabel="Add New Cost Category"
          openModal={() => openForm(null)}
        >
          <DataTable columns={columns} data={rows} onColumnFilterChange={handleFilterChange} total={rows.length} loading={loading} exportFilename="cost-category" />
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
              <Label required>Title</Label>
              <input
                type="text"
                value={title}
                maxLength={255}
                placeholder="e.g. Head Office"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    save();
                  }
                }}
                className={inputClass}
              />
            </div>
            {editing && (
              <div>
                <Label required>Status</Label>
                <ReactSelect options={COST_STATUS} value={status} isClearable={false} onChange={(value) => setStatus(value ? String(value) : "1")} />
              </div>
            )}
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
