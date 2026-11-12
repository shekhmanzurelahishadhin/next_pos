"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import Badge from "@/components/ui/badge/Badge";
import { Role } from "@/services/roleService";
import { formatDateTime } from "@/lib/format";

interface RoleDetailViewProps {
  role: Role;
}

// web roles blue, api roles green, any other orange
function guardColor(guardName: string) {
  if (guardName === "web") {
    return "primary";
  }
  if (guardName === "api") {
    return "success";
  }
  return "warning";
}

export function RoleDetailView({ role }: RoleDetailViewProps) {
  return (
    <DetailGrid>
      <DetailRow label="Role Name" value={role.name} />
      <DetailRow label="Guard Name" value={<Badge size="sm" color={guardColor(role.guard_name)} variant="light"> {role.guard_name} </Badge>} />
      <DetailRow label="Created At" value={formatDateTime(role.created_at || null)} />
      <DetailRow label="Updated At" value={formatDateTime(role.updated_at || null)} />
    </DetailGrid>
  );
}