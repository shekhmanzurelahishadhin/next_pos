"use client";
// Voucher Type, like parts_bazar accounting/voucherNoFormate:
// the 6 voucher types are fixed, only the number format of each can be updated.
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
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { formatDateTime } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { accountingSetupService, VoucherType, voucherNo } from "@/services/accountingSetupService";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

// the fixed voucher types, for the Voucher Type filter
const typeOptions = [
  { value: "1", label: "Journal" },
  { value: "2", label: "Contra" },
  { value: "3", label: "Cash Payment" },
  { value: "4", label: "Cash Receive" },
  { value: "5", label: "Bank Payment" },
  { value: "6", label: "Bank Receive" },
];

export default function VoucherTypePage() {
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState<VoucherType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});

  const [editing, setEditing] = useState<VoucherType | null>(null);
  const [format, setFormat] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await accountingSetupService.getVoucherTypes(filters);
      setRows(list);
    } catch {
      toast.error("Failed to load the voucher types");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Voucher Type | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  function openForm(row: VoucherType) {
    setEditing(row);
    setFormat(row.type_format);
    setError("");
  }

  function closeForm() {
    setEditing(null);
  }

  async function save() {
    if (!editing) {
      return;
    }
    setError("");
    const value = format.trim();
    if (value === "") {
      setError("Format cannot be blank.");
      return;
    }
    if (value.length > 255) {
      setError("Format is too long (maximum is 255 characters).");
      return;
    }

    try {
      setSaving(true);
      await accountingSetupService.updateVoucherType(editing.id, value);
      toast.success("successfully updated");
      setEditing(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<VoucherType>[] = [
    {
      id: "id",
      accessorKey: "id",
      header: "Voucher Type",
      meta: { filterVariant: "select", filterOptions: typeOptions, widthClass: "w-[180px]" },
      cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.name}</span>,
    },
    {
      id: "type_format",
      accessorKey: "type_format",
      header: "Format",
      meta: { widthClass: "w-[140px]" },
      cell: ({ row }) => <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{row.original.type_format}</span>,
    },
    {
      id: "voucher_no",
      header: "Voucher No Looks Like",
      meta: { filterVariant: "none", widthClass: "w-[170px]" },
      cell: ({ row }) => <span className="font-mono">{voucherNo(row.original.type_format, 1)}</span>,
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
      id: "updated_at",
      header: "Updated At",
      meta: { filterVariant: "none", widthClass: "w-[160px]" },
      cell: ({ row }) => {
        if (row.original.updated_by) {
          return formatDateTime(row.original.updated_at);
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
            { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Update", show: () => hasPermission("voucher-type.edit"), onClick: () => openForm(row.original) },
          ]}
        />
      ),
    },
  ];

  let saveLabel = "Update";
  if (saving) {
    saveLabel = "Saving...";
  }

  let previewFormat = format.trim();
  if (previewFormat === "") {
    previewFormat = "?";
  }

  return (
    <AccessRoute requiredPermissions={["voucher-type.view", "voucher-type.edit"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Voucher Type" }]} />
        <ComponentCard title="Manage Number Format" desc="The number format of each voucher type. A voucher number is shown as format# number, like JV# 1.">
          <DataTable columns={columns} data={rows} onColumnFilterChange={handleFilterChange} total={rows.length} loading={loading} exportFilename="voucher-type" />
        </ComponentCard>

        <Modal
          isOpen={editing !== null}
          onClose={closeForm}
          className="max-w-md"
          title="Update Format Info"
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>{saveLabel}</Button>
            </>
          }
        >
          {editing && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
              )}
              <div>
                <Label>Voucher Type</Label>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{editing.name}</p>
              </div>
              <div>
                <Label required>Format</Label>
                <input
                  type="text"
                  value={format}
                  maxLength={255}
                  placeholder="e.g. JV"
                  onChange={(e) => setFormat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      save();
                    }
                  }}
                  className={inputClass}
                />
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-400">
                Voucher No will look like <span className="font-mono font-semibold text-gray-800 dark:text-white/90">{voucherNo(previewFormat, 1)}</span>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AccessRoute>
  );
}
