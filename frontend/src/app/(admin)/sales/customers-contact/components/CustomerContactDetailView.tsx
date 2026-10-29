"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import { CustomerContact } from "@/services/customerContactService";

interface CustomerContactDetailViewProps {
  contact: CustomerContact;
  formatDate: (dateString?: string) => string;
}

export function CustomerContactDetailView({ contact, formatDate }: CustomerContactDetailViewProps) {
  return (
    <DetailGrid>
      <DetailRow label="Name" value={contact.customer_name} />
      <DetailRow label="District" value={contact.district} />
      <DetailRow label="Contact One" value={contact.contact_one} />
      <DetailRow label="Contact Two" value={contact.contact_two} />
      <DetailRow label="Contact Three" value={contact.contact_three} />
      <DetailRow label="Remarks" value={contact.remarks} />
      <DetailRow label="Created By" value={contact.created_by} />
      <DetailRow label="Created At" value={formatDate(contact.created_at)} />
    </DetailGrid>
  );
}
