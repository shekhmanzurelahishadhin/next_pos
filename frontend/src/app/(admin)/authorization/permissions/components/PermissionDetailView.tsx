"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import Badge from "@/components/ui/badge/Badge";
import { Permission } from "@/services/permissionService";
import { formatDateTime } from "@/lib/format";

interface PermissionDetailViewProps {
  permission: Permission;
}

export function PermissionDetailView({ permission }: PermissionDetailViewProps) {

  return (
    <DetailGrid>
      <DetailRow label="Permission Name" value={permission.name} />
      <DetailRow label="Module Name" value={permission.module_name ? permission.module_name : "-"} />
      <DetailRow label="Menu Name" value={permission.menu_name ? permission.menu_name : "-"} />
      <DetailRow label="Sub Menu Name" value={permission.sub_menu_name ? permission.sub_menu_name : '-'} />
      <DetailRow label="Created At" value={formatDateTime(permission.created_at || null)} />
      <DetailRow label="Updated At" value={formatDateTime(permission.updated_at || null)} />
    </DetailGrid>
  );
}