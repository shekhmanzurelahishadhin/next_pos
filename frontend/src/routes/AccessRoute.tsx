'use client';
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import ComponentCardSkeleton from "@/components/ui/skeleton/ComponentCardSkeleton";


interface AccessRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export default function AccessRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
}: AccessRouteProps) {
  const { loading, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  // Computed during render (not in an effect) so an allowed page shows immediately
  // instead of flashing a skeleton on every navigation.
  let allowed = true;
  if (requiredRoles.length > 0) {
    allowed = requiredRoles.some(role => hasRole(role));
  }
  if (allowed && requiredPermissions.length > 0) {
    allowed = requiredPermissions.some(perm => hasPermission(perm));
  }

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace("/unauthorized");
    }
  }, [loading, allowed, router]);

  // Show loader while auth loads or while redirecting away
  if (loading || !allowed) {
    return (
        <ComponentCardSkeleton/>
    );
  }

  // Render children only if access granted
  return <>{children}</>;
}
