"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Unit } from "@/services/unitService";

interface UnitDetailViewProps {
  unit: Unit;
  formatDate: (dateString?: string) => string;
}

export function UnitDetailView({ unit, formatDate }: UnitDetailViewProps) {
 
  return (
    <DetailGrid>
      <DetailRow label="Unit Name" value={unit.name} />
      <DetailRow label="Code" value={unit.code} />
      <DetailRow label="Status" value={<StatusBadge status={Number(unit.status)} trashed={!!unit.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(unit.created_at)} />
      <DetailRow label="Updated At" value={formatDate(unit.updated_at)} />
    </DetailGrid>
  );
}