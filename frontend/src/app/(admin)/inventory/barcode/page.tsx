"use client";
import { useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatDate, formatMoney } from "@/lib/format";
import { BarcodeRow, entryPointName, inventoryService } from "@/services/inventoryService";
import { useInventoryList } from "../useInventoryList";

const getBarcodes = (filters: Record<string, string | number>) => inventoryService.getBarcodes(filters);
const qty = (value: string) => <span className="block text-right">{Number(value)}</span>;

const STOCK_OPTIONS = [
  { value: "1", label: "In Stock" },
  { value: "2", label: "Finished" },
];

// parts_bazar inventory barcode: each received PO line with its landed price and what is left
export default function InventoryBarcodePage() {
  const list = useInventoryList(getBarcodes);

  useEffect(() => {
    document.title = "Inventory Barcode | Multibrand POS";
  }, []);

  const columns = useMemo((): ColumnDef<BarcodeRow>[] => [
    {
      id: "transaction_date",
      accessorKey: "transaction_date",
      header: "Date",
      meta: { filterVariant: "text", placeholder: "YYYY-MM-DD", widthClass: "w-[100px]" },
      cell: ({ row }) => formatDate(row.original.transaction_date),
    },
    {
      id: "barcode",
      accessorKey: "barcode",
      header: "Barcode",
      meta: { filterVariant: "text", widthClass: "w-[110px]" },
      cell: ({ row }) => <span className="font-mono font-medium text-gray-800 dark:text-white/90">{row.original.barcode}</span>,
    },
    {
      id: "entry_no",
      accessorKey: "entry_no",
      header: "Transaction No",
      meta: { filterVariant: "text", widthClass: "w-[110px]" },
      cell: ({ row }) => (
        <div>
          <div>{row.original.entry_no}</div>
          <div className="text-xs text-gray-400">{entryPointName(row.original.entry_point)}</div>
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
      id: "category",
      header: "Category / Brand",
      meta: { filterVariant: "none", widthClass: "w-[110px]" },
      cell: ({ row }) => (
        <div>
          <div>{row.original.category_name}</div>
          <div className="text-xs text-gray-400">{row.original.brand_name}</div>
        </div>
      ),
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
      id: "purchase_price",
      header: "Purchase Price",
      meta: { filterVariant: "none", widthClass: "w-[100px]" },
      cell: ({ row }) => <span className="block text-right">{formatMoney(row.original.purchase_price)}</span>,
    },
    {
      id: "sell_price",
      header: "Sell Price",
      meta: { filterVariant: "none", widthClass: "w-[90px]" },
      cell: ({ row }) => <span className="block text-right">{formatMoney(row.original.sell_price)}</span>,
    },
    {
      id: "stock_in",
      header: "Stock In",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => qty(row.original.stock_in),
    },
    {
      id: "stock_out",
      header: "Stock Out",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => qty(row.original.stock_out),
    },
    {
      id: "in_stock",
      accessorKey: "closing_stock",
      header: "Closing Stock",
      meta: { filterVariant: "select", filterOptions: STOCK_OPTIONS, widthClass: "w-[90px]" },
      cell: ({ row }) => (
        <span className={`block text-right font-semibold ${Number(row.original.closing_stock) > 0 ? "text-success-600 dark:text-success-400" : "text-gray-400"}`}>
          {Number(row.original.closing_stock)}
        </span>
      ),
    },
  ], [list.stores]);

  return (
    <AccessRoute requiredPermissions={["inventory-barcode.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Inventory Barcode" }]} />
        <ComponentCard title="Inventory Barcode" desc="One barcode for every received purchase item, with its landed price and the qty left.">
          <DataTable
            columns={columns}
            data={list.rows}
            pagination={list.pagination}
            onPaginationChange={list.setPagination}
            onColumnFilterChange={list.handleFilterChange}
            total={list.total}
            loading={list.loading}
            exportFilename="inventory-barcode"
          />
        </ComponentCard>
      </div>
    </AccessRoute>
  );
}
