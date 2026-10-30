"use client";
import { useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import AccessRoute from "@/routes/AccessRoute";
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
      cell: ({ row }) => <span className="font-medium text-gray-800 dark:text-white/90">{row.original.entry_no}</span>,
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
  ], [list.stores]);

  return (
    <AccessRoute requiredPermissions={["inventory-stock.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Inventory Stock" }]} />
        <ComponentCard title="Inventory Stock" desc="Every stock in and stock out: purchase approve, purchase return ...">
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
      </div>
    </AccessRoute>
  );
}
