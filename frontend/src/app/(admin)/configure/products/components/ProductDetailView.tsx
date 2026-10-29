"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Product } from "@/services/productService";

interface ProductDetailViewProps {
  product: Product;
  formatDate: (dateString?: string) => string;
}

export function ProductDetailView({ product, formatDate }: ProductDetailViewProps) {
  return (
    <DetailGrid>
      <DetailRow label="Part Number" value={product.part_number} />
      <DetailRow label="Product Name" value={product.name} />
      <DetailRow label="Category" value={product.product_category_name} />
      <DetailRow label="Sub-Category" value={product.sub_category_name} />
      <DetailRow label="Brand" value={product.brand_name} />
      <DetailRow label="Unit" value={product.unit_name} />
      <DetailRow label="Vehicle Brand" value={product.vehicle_brand_name} />
      <DetailRow label="Model" value={product.model} />
      <DetailRow label="Model Year" value={product.model_year} />
      <DetailRow label="Supported Models" value={product.supported_models} />
      <DetailRow label="Supported Years" value={product.year_models} />
      <DetailRow label="Country" value={product.country_name} />
      <DetailRow label="Manufacturer" value={product.manufacturer_name} />
      <DetailRow label="Color" value={product.color_name} />
      <DetailRow label="Size" value={product.size_name} />
      <DetailRow label="Warranty" value={product.warranty} />
      <DetailRow label="Min Order Qty" value={product.min_order_qty} />
      <DetailRow label="Engine" value={product.engine} />
      <DetailRow label="Chassis" value={product.chassis} />
      <DetailRow label="Unit Weight" value={product.unit_weight} />
      <DetailRow label="Alert Qty" value={product.alert_qty} />
      <DetailRow label="Short List Qty" value={product.short_list_qty} />
      <DetailRow label="Status" value={<StatusBadge status={product.status} trashed={!!product.deleted_at} />} />
      <DetailRow label="Created By" value={product.created_by} />
      <DetailRow label="Created At" value={formatDate(product.created_at)} />
      <DetailRow label="Features" value={product.features} full />
    </DetailGrid>
  );
}
