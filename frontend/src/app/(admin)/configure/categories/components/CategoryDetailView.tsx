"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Category } from "@/services/categoryService";

interface CategoryDetailViewProps {
  category: Category;
  formatDate: (dateString?: string) => string;
}

export function CategoryDetailView({ category, formatDate }: CategoryDetailViewProps) {
 
  return (
    <DetailGrid>
      <DetailRow label="Category Name" value={category.name} />
      <DetailRow label="Status" value={<StatusBadge status={Number(category.status)} trashed={!!category.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(category.created_at)} />
      <DetailRow label="Updated At" value={formatDate(category.updated_at)} />
    </DetailGrid>
  );
}