"use client";
import DetailRow, { DetailGrid } from "@/components/ui/detail/DetailRow";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { Company } from "@/services/companyService";
import Image from "next/image";
import { useMemo, useState } from "react"; // Add useState

interface CompanyDetailViewProps {
  company: Company;
  formatDate: (dateString?: string) => string;
}

export function CompanyDetailView({ company, formatDate }: CompanyDetailViewProps) {
  const [imageError, setImageError] = useState(false);
  
  // Helper function to get full logo URL
  const getLogoUrl = useMemo(() => {
    if (!company.logo) return null;
    
    // If logo already has full URL, use it
    if (company.logo.startsWith('http://') || company.logo.startsWith('https://')) {
      return company.logo;
    }
    
    // Get backend URL from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Remove any leading slashes from the logo path
    const logoPath = company.logo.startsWith('/') ? company.logo.slice(1) : company.logo;
    
    // Construct the full URL to access the logo from Laravel storage
    return `${baseUrl}/storage/${logoPath}`;
  }, [company.logo]);

  // For Next.js Image component, we need to configure the domain in next.config.js
  const logoUrl = getLogoUrl;

  return (
    <DetailGrid>
      <DetailRow
        label="Logo"
        value={
          logoUrl && !imageError ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700">
              <Image
                src={logoUrl}
                alt={`${company.name} logo`}
                fill
                className="object-contain p-1"
                sizes="64px"
                onError={() => setImageError(true)}
                unoptimized
              />
            </div>
          ) : (
            <span className="text-gray-400">{company.logo ? "Failed to load logo" : "No logo"}</span>
          )
        }
      />
      <DetailRow label="Company Name" value={company.name} />
      <DetailRow label="Status" value={<StatusBadge status={Number(company.status)} trashed={!!company.deleted_at} />} />
      <DetailRow label="Created At" value={formatDate(company.created_at)} />
      <DetailRow label="Updated At" value={formatDate(company.updated_at)} />
    </DetailGrid>
  );
}