"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { formatMoney } from "@/lib/format";
import { Supplier } from "@/services/supplierService";

interface SupplierDetailViewProps {
  supplier: Supplier;
  formatDate: (dateString?: string) => string;
}

export function SupplierDetailView({ supplier, formatDate }: SupplierDetailViewProps) {

  return (
    <DetailGrid>
      <DetailRow label="Supplier Name" value={supplier.name} />
      <DetailRow label="Email" value={supplier.email ?? "-"} />
      <DetailRow label="Phone" value={supplier.phone ?? "-"} />
      <DetailRow label="Address" value={supplier.address ?? "-"} />
      <DetailRow label="Balance Type" value={supplier.opening_balance_type == 1
                  ? "Debit"
                  : supplier.opening_balance_type == 2
                    ? "Credit"
                    : "Unknown" } />
      <DetailRow label="Opening Balance" value={formatMoney(supplier.opening_balance)} />
      <DetailRow label="Status" value={<StatusBadge status={Number(supplier.status)} trashed={!!supplier.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(supplier.created_at)} />
      <DetailRow label="Updated At" value={formatDate(supplier.updated_at)} />
    </DetailGrid>
  );
}