"use client";
import React from "react";
import Select from "react-select";
import makeAnimated from "react-select/animated";

interface Option {
  value: string | number;
  label: string;
}

interface ReactMultiSelectProps {
  value: (string | number)[];
  options: Option[];
  onChange: (values: (string | number)[]) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  isClearable?: boolean;
  isRtl?: boolean;
  isSearchable?: boolean;
  name?: string;

  error?: string | boolean;
  success?: boolean;
  hint?: string;
}

const ReactMultiSelect: React.FC<ReactMultiSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select options",
  className = "",
  isLoading = false,
  isDisabled = false,
  isClearable = true,
  isRtl = false,
  isSearchable = true,
  name = "",

  error = false,
  success = false,
  hint = "",
}) => {
  const animatedComponents = makeAnimated();

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const hasError = Boolean(error);
  return (
    <div>
    <Select
      isMulti
      unstyled
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isRtl={isRtl}
      isSearchable={isSearchable}
      name={name}
      // Show the menu above the modal so it is never cut off by a scrolling modal body
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 100001 }),
        option: (base) => ({
          ...base,
          fontSize: "14px",
        }),
        singleValue: (base) => ({
          ...base,
          fontSize: "14px",
        }),
        placeholder: (base) => ({
          ...base,
          fontSize: "14px",
        }),
      }}
      components={animatedComponents}
      classNamePrefix="select"
      value={selectedOptions}
      onChange={(selected) => onChange(selected.map((s: any) => s.value))}
      options={options}
      placeholder={placeholder}
      classNames={{
        control: ({ isFocused }) =>
          [
              "flex min-h-9 w-full items-center justify-between rounded-md border px-2.5 py-0.5 text-sm",
              "transition-all duration-200 appearance-none shadow-theme-xs",
              hasError
                ? "text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10 dark:text-error-400 dark:border-error-500"
                : success
                ? "text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300 dark:text-success-400 dark:border-success-500"
                : isFocused
                ? "border-brand-300 ring-3 ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:border-brand-800"
                : "border-gray-300 dark:border-gray-700",
              isDisabled
                ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
                : "bg-white dark:bg-gray-900 cursor-pointer",
              "text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30",
              "focus:outline-hidden",
            ].join(" "),
        valueContainer: () =>
          "flex flex-wrap gap-1 px-1 py-0.5 text-sm text-gray-800 dark:text-white/90",
        placeholder: () =>
            "text-gray-400 dark:text-white/30 text-sm select-none",
        multiValue: () =>
          "flex items-center gap-1 rounded-md bg-brand-100 dark:bg-brand-800 px-2 py-0.5 text-sm text-brand-700 dark:text-white",
        multiValueLabel: () => "truncate",
        multiValueRemove: () =>
          "ml-1 text-gray-500 hover:text-red-500 cursor-pointer",
        indicatorsContainer: () =>
          "flex items-center pr-2 text-gray-400 dark:text-gray-500",
        dropdownIndicator: ({ isFocused }) =>
          `transition-colors ${isFocused ? "text-brand-500" : "hover:text-gray-500"}`,
        indicatorSeparator: () => "hidden",
        menu: () =>
          "mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50",
        option: ({ isFocused, isSelected }) =>
          [
            "px-3 py-1.5 text-[13px] cursor-pointer select-none",
            isSelected
              ? "bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-white"
              : "text-gray-800 dark:text-gray-200",
            isFocused && !isSelected
              ? "bg-gray-100 dark:bg-gray-800"
              : "hover:bg-gray-100 dark:hover:bg-gray-800",
          ].join(" "),
        noOptionsMessage: () =>
          "text-gray-500 dark:text-gray-400 px-3 py-2 text-sm",
      }}
      className={`w-full ${className}`}
    />
    {/* Show error message if provided as string */}
      {typeof error === 'string' && error && (
        <p className="mt-1.5 text-xs text-error-500">
          {error}
        </p>
      )}

      {/* Show hint text if no error message */}
      {hint && !error && (
        <p className={`mt-1.5 text-xs ${
          success ? "text-success-500" : "text-gray-500"
        }`}>
          {hint}
        </p>
      )}
      </div>
  );
};

export default ReactMultiSelect;
