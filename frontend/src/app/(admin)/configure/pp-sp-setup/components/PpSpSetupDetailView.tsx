"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { PpSpSetup, convertPrice } from "@/services/ppSpSetupService";
import { CodeChips } from "./CodeChips";

interface PpSpSetupDetailViewProps {
  setup: PpSpSetup;
  formatDate: (dateString?: string) => string;
}

export function PpSpSetupDetailView({ setup, formatDate }: PpSpSetupDetailViewProps) {
  return (
    <DetailGrid>
      <DetailRow label="Type" value={setup.type_name} />
      <DetailRow label="Status" value={<StatusBadge status={setup.status} trashed={!!setup.deleted_at} />} />
      <DetailRow label="Codes" value={<CodeChips codes={setup.codes} wrap />} full />
      <DetailRow label="Example" value={`1250 → ${convertPrice("1250", setup.codes)}`} full />
      <DetailRow label="Created By" value={setup.created_by} />
      <DetailRow label="Created At" value={formatDate(setup.created_at)} />
    </DetailGrid>
  );
}
