"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { formatMoney } from "@/lib/format";
import { Customer } from "@/services/customerService";

interface CustomerDetailViewProps {
  customer: Customer;
  formatDate: (dateString?: string) => string;
}

export function CustomerDetailView({ customer, formatDate }: CustomerDetailViewProps) {

  return (
    <DetailGrid>
      <DetailRow label="Customer Name" value={customer.name} />
      <DetailRow label="Email" value={customer.email ?? "-"} />
      <DetailRow label="Phone" value={customer.phone ?? "-"} />
      <DetailRow label="Address" value={customer.address ?? "-"} />
      <DetailRow label="Customer Type" value={customer.customer_type_name ?? "-"} />
      <DetailRow label="Store / Depot" value={customer.store_name ?? "-"} />
      <DetailRow label="Car Name" value={customer.car_name || "-"} />
      <DetailRow label="Fax" value={customer.fax || "-"} />
      <DetailRow label="Website" value={customer.website || "-"} />
      <DetailRow label="Credit Limit" value={Number(customer.credit_limit ?? 0) > 0 ? formatMoney(customer.credit_limit) : "No limit"} />
      <DetailRow label="Balance Type" value={customer.opening_balance_type == 1
                  ? "Debit"
                  : customer.opening_balance_type == 2
                    ? "Credit"
                    : "Unknown" } />
      <DetailRow label="Opening Balance" value={formatMoney(customer.opening_balance)} />
      <DetailRow label="Status" value={<StatusBadge status={Number(customer.status)} trashed={!!customer.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(customer.created_at)} />
      <DetailRow label="Updated At" value={formatDate(customer.updated_at)} />
    </DetailGrid>
  );
}