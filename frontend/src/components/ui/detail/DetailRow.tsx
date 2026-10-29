import React from "react";

// Grid that holds DetailRow items in the "view" modals (two columns on wide screens)
export function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">{children}</div>;
}

// One label / value line in a "view" modal
export default function DetailRow({ label, value, full = false }: { label: string; value?: React.ReactNode; full?: boolean }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={`flex gap-3 border-b border-gray-100 py-2 text-[13px] dark:border-gray-700 ${full ? "md:col-span-2" : ""}`}>
      <span className="w-32 shrink-0 text-gray-500 dark:text-gray-400">{label}</span>
      <span className="min-w-0 break-words font-medium text-gray-800 dark:text-white/90">{empty ? "—" : value}</span>
    </div>
  );
}
