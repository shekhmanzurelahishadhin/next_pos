"use client";
// Search form of every report: a card with the fields in a grid and Search / Reset buttons
import { useState } from "react";
import { FiChevronDown, FiFilter, FiRotateCcw, FiSearch } from "react-icons/fi";
import Label from "@/components/form/Label";

export const reportInputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export function ReportField({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label required={required} className="mb-1 text-xs">{label}</Label>
      {children}
    </div>
  );
}

interface Props {
  title: string;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function ReportSearchCard({ title, onSearch, onReset, loading, error, children }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
            <FiFilter className="size-3.5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">{title}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">Search conditions</span>
          </span>
        </span>
        <FiChevronDown className={`size-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form
          className="border-t border-gray-100 px-4 py-4 dark:border-gray-800"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">{children}</div>

          {error && (
            <div className="mt-3 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <FiRotateCcw className="size-3.5" /> Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              <FiSearch className="size-3.5" /> {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
