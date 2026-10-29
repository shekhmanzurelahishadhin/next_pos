"use client";

import { useState } from "react";
import { Column } from "@tanstack/react-table";
import Select from "react-select";

interface FilterProps {
  column: Column<any, unknown>;
  options?: { value: string; label: string }[];
  onFilterChange?: (columnId: string, value: string) => void; // only stores the value, DataTable applies it
  onApply?: () => void; // Enter in a text filter applies at once
}

export function Filter({ column, options, onFilterChange, onApply }: FilterProps) {
  const [value, setValue] = useState("");
  const { filterVariant } = column.columnDef.meta ?? {};
  const filterOptions = options || column.columnDef.meta?.filterOptions;

    // Get column header text for placeholder
  const getColumnHeaderText = () => {
    const header = column.columnDef.header;
    if (typeof header === "string") {
      return header;
    }
    if (typeof header === "function") {
      // Try to extract text from header function result
      return "Filter";
    }
    return "Filter";
  };

  // Get placeholder from meta or use header text
  const placeholder = column.columnDef.meta?.placeholder || `Search ${getColumnHeaderText()}`;


  const handleChange = (newValue: string) => {
    setValue(newValue);
    onFilterChange?.(column.id, newValue);
  };

  // Searchable dropdown (like select2) for long lists
  if (filterVariant === "searchSelect") {
    const selected = filterOptions?.find((option) => option.value === value) ?? null;
    return (
      <Select
        unstyled
        isClearable
        classNamePrefix="dt-filter"
        options={filterOptions ?? []}
        value={selected}
        onChange={(option) => handleChange(option ? String(option.value) : "")}
        placeholder="All"
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 100001 }), menu: (base) => ({ ...base, minWidth: 200 }) }}
        classNames={{
          control: ({ isFocused }) =>
            `min-h-7! h-7 min-w-[90px] rounded-md border bg-white px-2 text-xs font-normal dark:bg-gray-900 ${
              isFocused ? "border-brand-300 dark:border-brand-800" : "border-gray-300 dark:border-gray-700"
            }`,
          valueContainer: () => "truncate",
          placeholder: () => "text-gray-700 dark:text-gray-300",
          singleValue: () => "text-gray-700 dark:text-gray-300",
          input: () => "text-gray-700 dark:text-gray-300",
          indicatorsContainer: () => "gap-0.5 text-gray-400",
          clearIndicator: () => "cursor-pointer hover:text-gray-600 [&_svg]:h-3.5 [&_svg]:w-3.5",
          dropdownIndicator: () => "[&_svg]:h-3.5 [&_svg]:w-3.5",
          indicatorSeparator: () => "hidden",
          menu: () => "mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900",
          option: ({ isFocused, isSelected }) =>
            `cursor-pointer px-3 py-1.5 text-xs font-normal ${
              isSelected
                ? "bg-brand-100 text-brand-700 dark:bg-brand-800 dark:text-white"
                : isFocused
                ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                : "text-gray-800 dark:text-gray-200"
            }`,
          noOptionsMessage: () => "px-3 py-2 text-xs text-gray-500",
        }}
      />
    );
  }

  if (filterVariant === "select") {
    return (
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full min-w-[70px] text-xs h-7 rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900  focus:border-brand-300 dark:focus:border-brand-800 border-stroke px-2 text-gray-700 focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark dark:text-gray-300"
      >
        <option className="text-gray-700 dark:bg-gray-900 dark:text-gray-400" value="">All</option>
        {filterOptions?.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onApply?.()}
      placeholder="Search…"
      className="w-full min-w-[70px] text-xs h-7 rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 focus:border-brand-300 dark:focus:border-brand-800 border-stroke px-2 text-gray-700 placeholder-gray-400 focus:outline-none dark:border-strokedark dark:bg-boxdark dark:text-gray-300 dark:placeholder-gray-500"
    />
  );
}