"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { FiDollarSign } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { formatMoney } from "@/lib/format";
import { ProductPriceRow } from "@/services/productPriceService";
import { productColumns, useProductPriceList } from "../_product-prices/useProductPriceList";
import { PurchasePriceModal } from "../_product-prices/PriceModals";

const money = (value: number | null) => <span className="block text-right">{value === null ? "—" : formatMoney(value)}</span>;

// parts_bazar "Add Purchase Prices": active purchase price of each product, add a new one by hand
export default function PurchasePricePage() {
  const { hasPermission } = useAuth();
  const list = useProductPriceList();
  const [selected, setSelected] = useState<ProductPriceRow | null>(null);

  useEffect(() => {
    document.title = "Purchase Price | Multibrand POS";
  }, []);

  const columns = useMemo((): ColumnDef<ProductPriceRow>[] => [
    ...productColumns(list.categories, list.subCategories),
    {
      id: "purchase_price_date",
      header: "Date",
      meta: { filterVariant: "none", widthClass: "w-[100px]" },
      cell: ({ row }) => row.original.purchase_price_date ?? "—",
    },
    {
      id: "purchase_price",
      header: "Active Purchase Price",
      meta: { filterVariant: "none", widthClass: "w-[120px]" },
      cell: ({ row }) => money(row.original.purchase_price),
    },
    {
      id: "sell_price",
      header: "Active Sell Price",
      meta: { filterVariant: "none", widthClass: "w-[120px]" },
      cell: ({ row }) => money(row.original.sell_price),
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[{
            icon: FiDollarSign, variant: "success", size: "sm", tooltip: "Add Purchase Price",
            show: () => hasPermission("purchase-price.create"),
            onClick: () => setSelected(row.original),
          }]}
        />
      ),
    },
  ], [list.categories, list.subCategories, hasPermission]);

  return (
    <AccessRoute requiredPermissions={["purchase-price.view", "purchase-price.create"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Configure" }, { title: "Purchase Price" }]} />
        <ComponentCard title="Add Purchase Prices" desc="Active purchase price of every product. Approving a purchase also sets it.">
          <DataTable
            columns={columns}
            data={list.rows}
            pagination={list.pagination}
            onPaginationChange={list.setPagination}
            onColumnFilterChange={list.handleFilterChange}
            total={list.total}
            loading={list.loading}
            exportFilename="purchase-prices"
          />
        </ComponentCard>
        <PurchasePriceModal product={selected} onClose={() => setSelected(null)} onSaved={list.reload} />
      </div>
    </AccessRoute>
  );
}
