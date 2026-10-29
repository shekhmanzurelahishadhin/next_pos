"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Location } from "@/services/locationService";

interface LocationDetailViewProps {
  location: Location;
  formatDate: (dateString?: string) => string;
}

export function LocationDetailView({ location, formatDate }: LocationDetailViewProps) {
  return (
    <DetailGrid>
      <DetailRow label="Code" value={location.code} />
      <DetailRow label="Location Name" value={location.name} />
      <DetailRow label="Store" value={location.store_name} />
      <DetailRow label="Company" value={location.company_name} />
      <DetailRow label="Description" value={location.description} />
      <DetailRow label="Status" value={<StatusBadge status={location.status} trashed={!!location.deleted_at} />} />
      <DetailRow label="Created By" value={location.created_by} />
      <DetailRow label="Created At" value={formatDate(location.created_at)} />
    </DetailGrid>
  );
}
