"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import Badge from "@/components/ui/badge/Badge";
import { Role } from "@/services/roleService";
import { formatDateTime } from "@/lib/format";

interface RoleDetailViewProps {
  role: Role;
}

export function RoleDetailView({ role }: RoleDetailViewProps) {

  return (
    <DetailGrid>
      <DetailRow label="Role Name" value={role.name} />
      <DetailRow label="Guard Name" value={<><Badge size="sm" color={ role.guard_name === "web" ? "primary" : role.guard_name === "api" ? "success" : "warning" } variant="light" > {role.guard_name} </Badge></>} />
      <DetailRow label="Created At" value={formatDateTime(role.created_at || null)} />
      <DetailRow label="Updated At" value={formatDateTime(role.updated_at || null)} />
    </DetailGrid>
  );
}