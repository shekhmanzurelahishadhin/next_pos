"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { formatMoney } from "@/lib/format";
import { Customer } from "@/services/customerService";

interface CustomerDetailViewProps {
  customer: Customer;
  formatDate: (dateString?: string) => string;
}

// opening balance type 1 = debit (they owe us), 2 = credit (we owe them)
function balanceTypeName(type: number) {
  if (type == 1) {
    return "Debit";
  }
  if (type == 2) {
    return "Credit";
  }
  return "Unknown";
}

export function CustomerDetailView({ customer, formatDate }: CustomerDetailViewProps) {
  let creditLimit = "No limit";
  if (Number(customer.credit_limit ?? 0) > 0) {
    creditLimit = formatMoney(customer.credit_limit);
  }

  return (
    <DetailGrid>
      <DetailRow label="Customer Name" value={customer.name} />
      <DetailRow label="Email" value={customer.email ?? "-"} />
      <DetailRow label="Phone" value={customer.phone ?? "-"} />
      <DetailRow label="Address" value={customer.address ?? "-"} />
      <DetailRow label="Customer Type" value={customer.customer_type_name ?? "-"} />
      <DetailRow label="Store / Depot" value={customer.store_name ?? "-"} />
      <DetailRow label="Car Name" value={customer.car_name || "-"} />
      <DetailRow label="Car No" value={customer.car_no || "-"} />
      <DetailRow label="Fax" value={customer.fax || "-"} />
      <DetailRow label="Website" value={customer.website || "-"} />
      <DetailRow label="Credit Limit" value={creditLimit} />
      <DetailRow label="Balance Type" value={balanceTypeName(customer.opening_balance_type)} />
      <DetailRow label="Opening Balance" value={formatMoney(customer.opening_balance)} />
      <DetailRow label="Status" value={<StatusBadge status={Number(customer.status)} trashed={!!customer.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(customer.created_at)} />
      <DetailRow label="Updated At" value={formatDate(customer.updated_at)} />
    </DetailGrid>
  );
}