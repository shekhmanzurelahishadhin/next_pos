"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { SubCategory } from "@/services/subCategoryService";

interface SubCategoryDetailViewProps {
  subCategory: SubCategory;
  formatDate: (dateString?: string) => string;
}

export function SubCategoryDetailView({ subCategory, formatDate }: SubCategoryDetailViewProps) {
 
  return (
    <DetailGrid>
      <DetailRow label="Sub-Category Name" value={subCategory.name} />
      <DetailRow label="Category Name" value={subCategory.category_name} />
      <DetailRow label="Status" value={<StatusBadge status={Number(subCategory.status)} trashed={!!subCategory.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(subCategory.created_at)} />
      <DetailRow label="Updated At" value={formatDate(subCategory.updated_at)} />
    </DetailGrid>
  );
}