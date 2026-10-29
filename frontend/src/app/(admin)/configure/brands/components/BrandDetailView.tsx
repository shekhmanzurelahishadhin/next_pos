"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Brand } from "@/services/brandService";

interface BrandDetailViewProps {
  brand: Brand;
  formatDate: (dateString?: string) => string;
}

export function BrandDetailView({ brand, formatDate }: BrandDetailViewProps) {
 
  return (
    <DetailGrid>
      <DetailRow label="Brand Name" value={brand.name} />
      <DetailRow label="Status" value={<StatusBadge status={Number(brand.status)} trashed={!!brand.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(brand.created_at)} />
      <DetailRow label="Updated At" value={formatDate(brand.updated_at)} />
    </DetailGrid>
  );
}