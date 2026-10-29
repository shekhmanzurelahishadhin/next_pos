"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Store } from "@/services/storeService";

interface StoreDetailViewProps {
  store: Store;
  formatDate: (dateString?: string) => string;
}

export function StoreDetailView({ store, formatDate }: StoreDetailViewProps) {
 
  return (
    <DetailGrid>
      <DetailRow label="Store Name" value={store.name} />
      <DetailRow label="Code" value={store.code} />
      <DetailRow label="Company" value={store.company_name} />
      <DetailRow label="Address" value={store.address} />
      <DetailRow label="Status" value={<StatusBadge status={Number(store.status)} trashed={!!store.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(store.created_at)} />
      <DetailRow label="Updated At" value={formatDate(store.updated_at)} />
    </DetailGrid>
  );
}