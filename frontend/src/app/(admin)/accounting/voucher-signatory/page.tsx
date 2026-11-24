"use client";
// Voucher Signatory Setup, like parts_bazar accounting/voucherSignatorySetup:
// the signature names of each voucher type and their order.
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
import { accountingSetupService, COST_STATUS, Option, VoucherSignatory } from "@/services/accountingSetupService";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function VoucherSignatoryPage() {
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState<VoucherSignatory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const [typeOptions, setTypeOptions] = useState<Option[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VoucherSignatory | null>(null);
  const [voucherType, setVoucherType] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [orderQty, setOrderQty] = useState("");
  const [status, setStatus] = useState("1");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await accountingSetupService.getSignatories(filters);
      setRows(list);
    } catch {
      toast.error("Failed to load the voucher signatories");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // the 6 voucher types, for the form and the filter
  useEffect(() => {
    document.title = "Voucher Signatory Setup | Multibrand POS";
    accountingSetupService
      .getVoucherTypes()
      .then((types) => {
        const list: Option[] = [];
        for (const type of types) {
          list.push({ value: String(type.id), label: type.name });
        }
        setTypeOptions(list);
      })
      .catch(() => toast.error("Failed to load the voucher types"));
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  function openForm(row: VoucherSignatory | null) {
    setEditing(row);
    setError("");
    if (row) {
      setVoucherType(String(row.voucher_type));
      setSignatoryName(row.signatory_name);
      setOrderQty(String(row.order_qty));
      setStatus(String(row.status));
    } else {
      setVoucherType("");
      setSignatoryName("");
      setOrderQty("");
      setStatus("1");
    }
    setModalOpen(true);
  }

  async function save() {
    setError("");
    const name = signatoryName.trim();
    const order = orderQty.trim();
    if (!voucherType) {
      setError("Voucher Type cannot be blank.");
      return;
    }
    if (!name) {
      setError("Signatory Name cannot be blank.");
      return;
    }
    if (name.length > 255) {
      setError("Signatory Name is too long (maximum is 255 characters).");
      return;
    }
    if (!order) {
      setError("Order cannot be blank.");
      return;
    }
    if (!/^-?\d+$/.test(order)) {
      setError("Order must be an integer.");
      return;
    }
    if (Number(order) < 1) {
      setError("Order quantity must be greater than zero.");
      return;
    }

    const payload = { voucher_type: voucherType, signatory_name: name, order_qty: order, status: status };
    try {
      setSaving(true);
      if (editing) {
        await accountingSetupService.saveSignatory(payload, editing.id);
        toast.success("successfully updated");
      } else {
        await accountingSetupService.saveSignatory(payload);
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

  function saveOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      save();
    }
  }

  const columns: ColumnDef<VoucherSignatory>[] = [
    {
      id: "voucher_type",
      accessorKey: "voucher_type",
      header: "Voucher Type",
      meta: { filterVariant: "select", filterOptions: typeOptions, widthClass: "w-[180px]" },
      cell: ({ row }) => {
        if (row.original.type) {
          return <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.type.name}</span>;
        }
        return "";
      },
    },
    {
      id: "signatory_name",
      accessorKey: "signatory_name",
      header: "Signatory Name",
      meta: { filterVariant: "text" },
    },
    {
      id: "order_qty",
      accessorKey: "order_qty",
      header: "Order",
      meta: { filterVariant: "text", widthClass: "w-[100px]" },
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
            { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Update", show: () => hasPermission("voucher-signatory.edit"), onClick: () => openForm(row.original) },
          ]}
        />
      ),
    },
  ];

  let modalTitle = "Add New Voucher Signatory";
  let saveLabel = "Save";
  if (editing) {
    modalTitle = "Update Voucher Signatory";
    saveLabel = "Update";
  }
  if (saving) {
    saveLabel = "Saving...";
  }

  return (
    <AccessRoute requiredPermissions={["voucher-signatory.view", "voucher-signatory.create", "voucher-signatory.edit"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Voucher Signatory Setup" }]} />
        <ComponentCard
          title="Voucher Signatory Setup"
          desc="Signature names of each voucher type. Order sets the place of the signature on the voucher (1 comes first)."
          showAddButton={hasPermission("voucher-signatory.create")}
          buttonLabel="Add New Voucher Signatory"
          openModal={() => openForm(null)}
        >
          <DataTable columns={columns} data={rows} onColumnFilterChange={handleFilterChange} total={rows.length} loading={loading} exportFilename="voucher-signatory" />
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
              <Label required>Voucher Type</Label>
              <ReactSelect options={typeOptions} value={voucherType} placeholder="Select" onChange={(value) => setVoucherType(value ? String(value) : "")} />
            </div>
            <div>
              <Label required>Signatory Name</Label>
              <input
                type="text"
                value={signatoryName}
                maxLength={255}
                placeholder="e.g. Prepared By"
                onChange={(e) => setSignatoryName(e.target.value)}
                onKeyDown={saveOnEnter}
                className={inputClass}
              />
            </div>
            <div>
              <Label required>Order</Label>
              <input
                type="text"
                inputMode="numeric"
                value={orderQty}
                placeholder="1"
                onChange={(e) => setOrderQty(e.target.value)}
                onKeyDown={saveOnEnter}
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
