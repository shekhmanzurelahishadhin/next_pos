"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Lookup } from "@/services/lookupService";

interface LookupDetailViewProps {
  lookup: Lookup;
  formatDate: (dateString?: string) => string;
}

export function LookupDetailView({ lookup, formatDate }: LookupDetailViewProps) {
 
  return (
    <DetailGrid>
      <DetailRow label="Lookup Name" value={lookup.name} />
      <DetailRow label="Type" value={lookup.type} />
      <DetailRow label="Code" value={lookup.code} />
      <DetailRow label="Status" value={<StatusBadge status={Number(lookup.status)} trashed={!!lookup.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(lookup.created_at)} />
      <DetailRow label="Updated At" value={formatDate(lookup.updated_at)} />
    </DetailGrid>
  );
}