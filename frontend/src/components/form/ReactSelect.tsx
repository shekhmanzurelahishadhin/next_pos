"use client";
import React from "react";
import Select, { SingleValue } from "react-select";

interface Option {
  value: string | number;
  label: string;
}

interface ReactSelectProps {
  options: Option[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  isRtl?: boolean;
  isSearchable?: boolean;
  name?: string;
  className?: string;

  error?: string | boolean;
  success?: boolean;
  hint?: string;
}

const ReactSelect: React.FC<ReactSelectProps> = ({
  options,
  value = null,
  onChange,
  placeholder = "Select an option",
  isDisabled = false,
  isLoading = false,
  isClearable = true,
  isRtl = false,
  isSearchable = true,
  name = "select",
  className = "",

  error = false,
  success = false,
  hint = "",
}) => {
  const selectedOption = options.find((opt) => opt.value === value) || null;
  const hasError = Boolean(error);

  const handleChange = (selected: SingleValue<Option>) => {
    onChange(selected ? selected.value : null);
  };

  return (
    <div className={`w-full ${className}`}>

      <Select
        unstyled
        // Show the menu above the modal so it is never cut off by a scrolling modal body
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 100001 }),
          // same 36px height as the text inputs
          control: (base) => ({ ...base, minHeight: 36, height: 36 }),
          valueContainer: (base) => ({ ...base, height: 34, padding: 0 }),
          input: (base) => ({ ...base, margin: 0, padding: 0 }),
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
        classNamePrefix="select"
        value={selectedOption}
        onChange={handleChange}
        isDisabled={isDisabled}
        isLoading={isLoading}
        isClearable={isClearable}
        isRtl={isRtl}
        isSearchable={isSearchable}
        name={name}
        options={options}
        placeholder={placeholder}
        classNames={{
          control: ({ isFocused, isDisabled }) =>
            [
              "flex w-full items-center justify-between rounded-md border px-2.5 text-sm",
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
          valueContainer: () => "flex-1 truncate",
          placeholder: () =>
            "text-gray-400 dark:text-white/30 text-sm select-none",
          input: () => "text-gray-800 dark:text-white/90",
          singleValue: () => "text-gray-800 dark:text-white/90",
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

export default ReactSelect;
