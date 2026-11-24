"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import AccessRoute from "@/routes/AccessRoute";
import ActionButtons from "@/components/ui/button/ActionButton";
import { apiErrorMessage } from "@/lib/options";
import ManualStockModal from "../components/ManualStockModal";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatDate, formatMoney } from "@/lib/format";
import { ENTRY_POINTS, entryPointName, inventoryService, StockRow } from "@/services/inventoryService";
import { useInventoryList } from "../useInventoryList";

const getStock = (filters: Record<string, string | number>) => inventoryService.getStock(filters);
const qty = (value: string) => <span className="block text-right">{Number(value) || ""}</span>;

// parts_bazar "Manage Inventory Stock Record": every stock in and stock out
export default function InventoryStockPage() {
  const list = useInventoryList(getStock);
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();
  const [manualOpen, setManualOpen] = useState(false);
  const reload = list.reload;

  // only a manual stock in / out can be deleted here, its stock and journal go with it
  const removeManual = useCallback(async (row: StockRow) => {
    const result = await confirm({ title: "Delete Manual Stock?", text: "Are you sure, you delete this manual stock " + row.entry_no + "? Its stock and journal will be deleted." });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await inventoryService.deleteManualStock(row.id);
      toast.success("Deleted successfully");
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete"));
    }
  }, [confirm, reload]);

  useEffect(() => {
    document.title = "Inventory Stock | Multibrand POS";
  }, []);

  const columns = useMemo((): ColumnDef<StockRow>[] => [
    {
      id: "transaction_date",
      accessorKey: "transaction_date",
      header: "Date",
      meta: { filterVariant: "text", placeholder: "YYYY-MM-DD", widthClass: "w-[100px]" },
      cell: ({ row }) => formatDate(row.original.transaction_date),
    },
    {
      id: "entry_point",
      accessorKey: "entry_point",
      header: "Transaction Point",
      meta: { filterVariant: "select", filterOptions: ENTRY_POINTS, widthClass: "w-[120px]" },
      cell: ({ row }) => entryPointName(row.original.entry_point),
    },
    {
      id: "entry_no",
      accessorKey: "entry_no",
      header: "Transaction No",
      meta: { filterVariant: "text", widthClass: "w-[110px]" },
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-gray-800 dark:text-white/90">{row.original.entry_no}</span>
          {row.original.remarks && <div className="text-xs text-gray-400">{row.original.remarks}</div>}
        </div>
      ),
    },
    {
      id: "store_id",
      accessorKey: "store_id",
      header: "Store",
      meta: { filterVariant: "searchSelect", filterOptions: list.stores, widthClass: "min-w-[150px]" },
      cell: ({ row }) => row.original.store_name,
    },
    {
      id: "location_name",
      accessorKey: "location_name",
      header: "Location",
      meta: { filterVariant: "text", widthClass: "w-[110px]" },
      cell: ({ row }) => row.original.location_name,
    },
    {
      id: "product_name",
      accessorKey: "product_name",
      header: "Product Name",
      meta: { filterVariant: "text", widthClass: "w-[150px]" },
      cell: ({ row }) => row.original.product_name,
    },
    {
      id: "part_number",
      accessorKey: "part_number",
      header: "Part Number",
      meta: { filterVariant: "text", widthClass: "w-[120px]" },
      cell: ({ row }) => <span className="font-medium text-gray-800 dark:text-white/90">{row.original.part_number}</span>,
    },
    {
      id: "barcode",
      accessorKey: "barcode",
      header: "Barcode",
      meta: { filterVariant: "text", widthClass: "w-[110px]" },
      cell: ({ row }) => row.original.barcode,
    },
    {
      id: "unit",
      header: "Unit",
      meta: { filterVariant: "none", widthClass: "w-[50px]" },
      cell: ({ row }) => row.original.unit_name,
    },
    {
      id: "stock_in",
      header: "Stock In",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => <span className="text-success-600 dark:text-success-400">{qty(row.original.stock_in)}</span>,
    },
    {
      id: "stock_out",
      header: "Stock Out",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => <span className="text-error-600 dark:text-error-400">{qty(row.original.stock_out)}</span>,
    },
    {
      id: "purchase_price",
      header: "Purchase Price",
      meta: { filterVariant: "none", widthClass: "w-[100px]" },
      cell: ({ row }) => <span className="block text-right">{formatMoney(row.original.purchase_price)}</span>,
    },
    {
      id: "created_by",
      header: "Created By",
      meta: { filterVariant: "none", widthClass: "w-[110px]" },
      cell: ({ row }) => row.original.created_by_name,
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            {
              icon: FiTrash,
              variant: "danger",
              size: "sm",
              tooltip: "Delete",
              show: () => row.original.entry_point === "manual" && hasPermission("inventory-stock.delete"),
              onClick: () => removeManual(row.original),
            },
          ]}
        />
      ),
    },
  ], [list.stores, hasPermission, removeManual]);

  return (
    <AccessRoute requiredPermissions={["inventory-stock.view", "inventory-stock.create", "inventory-stock.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Inventory Stock" }]} />
        <ComponentCard
          title="Inventory Stock"
          desc="Every stock in and stock out: purchase approve, purchase return ... A manual stock in / out also writes an Inventory Adjustment journal."
          showAddButton={hasPermission("inventory-stock.create")}
          buttonLabel="Manual Stock In / Out"
          openModal={() => setManualOpen(true)}
        >
          <DataTable
            columns={columns}
            data={list.rows}
            pagination={list.pagination}
            onPaginationChange={list.setPagination}
            onColumnFilterChange={list.handleFilterChange}
            total={list.total}
            loading={list.loading}
            exportFilename="inventory-stock"
          />
        </ComponentCard>
        <ManualStockModal isOpen={manualOpen} onClose={() => setManualOpen(false)} onSaved={reload} />
      </div>
    </AccessRoute>
  );
}
