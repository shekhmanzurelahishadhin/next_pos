"use client";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { FiClock, FiDollarSign } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { formatMoney } from "@/lib/format";
import { ProductPriceRow } from "@/services/productPriceService";
import { productColumns, useProductPriceList } from "../_product-prices/useProductPriceList";
import { SellPriceHistoryModal, SellPriceModal } from "../_product-prices/PriceModals";

// parts_bazar "Add Sale Prices": active sell price and discount of each product, history, add a new one
export default function SalePricePage() {
  const { hasPermission } = useAuth();
  const list = useProductPriceList();
  const [adding, setAdding] = useState<ProductPriceRow | null>(null);
  const [history, setHistory] = useState<ProductPriceRow | null>(null);

  useEffect(() => {
    document.title = "Sale Price | Multibrand POS";
  }, []);

  const columns = useMemo((): ColumnDef<ProductPriceRow>[] => [
    ...productColumns(list.categories, list.subCategories),
    {
      id: "sell_price",
      header: "Active Sell Price",
      meta: { filterVariant: "none", widthClass: "w-[120px]" },
      cell: ({ row }) => (
        <span className="block text-right font-medium text-error-600 dark:text-error-400">
          {row.original.sell_price === null ? "—" : formatMoney(row.original.sell_price)}
        </span>
      ),
    },
    {
      id: "discount",
      header: "Discount (%)",
      meta: { filterVariant: "none", widthClass: "w-[90px]" },
      cell: ({ row }) => <span className="block text-right">{row.original.discount === null ? "—" : `${Number(row.original.discount)}%`}</span>,
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[90px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            { icon: FiClock, variant: "info", size: "sm", tooltip: "Sell Price History", onClick: () => setHistory(row.original) },
            {
              icon: FiDollarSign, variant: "success", size: "sm", tooltip: "Add Sell Price",
              show: () => hasPermission("sell-price.create"),
              onClick: () => setAdding(row.original),
            },
          ]}
        />
      ),
    },
  ], [list.categories, list.subCategories, hasPermission]);

  return (
    <AccessRoute requiredPermissions={["sell-price.view", "sell-price.create"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Configure" }, { title: "Sale Price" }]} />
        <ComponentCard title="Add Sale Prices" desc="Active sell price of every product. Approving a purchase also sets it.">
          <DataTable
            columns={columns}
            data={list.rows}
            pagination={list.pagination}
            onPaginationChange={list.setPagination}
            onColumnFilterChange={list.handleFilterChange}
            total={list.total}
            loading={list.loading}
            exportFilename="sale-prices"
          />
        </ComponentCard>
        <SellPriceModal product={adding} onClose={() => setAdding(null)} onSaved={list.reload} />
        <SellPriceHistoryModal product={history} onClose={() => setHistory(null)} />
      </div>
    </AccessRoute>
  );
}
