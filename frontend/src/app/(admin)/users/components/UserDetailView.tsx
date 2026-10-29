"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import { User } from "@/services/userService";

interface UserDetailViewProps {
  user: User;
  formatDate: (dateString?: string) => string;
}

export function UserDetailView({ user, formatDate }: UserDetailViewProps) {
  return (
    <DetailGrid>
      <DetailRow label="User Name" value={user.name} />
      <DetailRow label="Email" value={user.email} />
      <DetailRow label="Company" value={typeof user.company === "string" ? user.company : null} />
      <DetailRow label="Roles" value={user.roles_name} />
      <DetailRow label="Created At" value={formatDate(user.created_at)} />
      <DetailRow label="Updated At" value={formatDate(user.updated_at)} />
    </DetailGrid>
  );
}
