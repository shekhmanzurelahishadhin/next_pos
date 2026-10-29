"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { ScrollCodes, buildScrollNo, scrollCodeService } from "@/services/scrollCodeService";
import { ScrollCodeCard } from "./components/ScrollCodeCard";

export default function ScrollSetup() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("scroll-setup.edit");
  const [codes, setCodes] = useState<ScrollCodes | null>(null);

  useEffect(() => {
    document.title = "Scroll Number Setup | Multibrand POS";
    scrollCodeService.getCodes()
      .then(setCodes)
      .catch(() => toast.error("Failed to load scroll codes"));
  }, []);

  return (
    <AccessRoute requiredPermissions={["scroll-setup.view", "scroll-setup.edit"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Configure" }, { title: "Scroll Number Setup" }]} />

        {!codes ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-6">
            <ComponentCard
              title="Scroll Number Setup"
              desc="Document number = Prefix + Month code + Serial + Year code. First numbers of this month:"
            >
              <div className="flex flex-wrap gap-2">
                {codes.prefix.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700"
                  >
                    <span className="text-gray-500 dark:text-gray-400">{item.label}: </span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">{buildScrollNo(codes, item.key)}</span>
                  </div>
                ))}
              </div>
            </ComponentCard>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              <ScrollCodeCard
                type="prefix"
                title="Prefix Setup"
                desc="Code at the start of each document number"
                items={codes.prefix}
                maxLength={5}
                canEdit={canEdit}
                onSaved={setCodes}
              />
              <ScrollCodeCard
                type="month"
                title="Month Setup"
                desc="Code for each month"
                items={codes.month}
                maxLength={3}
                canEdit={canEdit}
                onSaved={setCodes}
              />
              <ScrollCodeCard
                type="year"
                title="Year Setup"
                desc="Code for each digit of the year (last 2 digits)"
                items={codes.year}
                maxLength={3}
                canEdit={canEdit}
                onSaved={setCodes}
              />
            </div>
          </div>
        )}
      </div>
    </AccessRoute>
  );
}
