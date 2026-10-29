import React, { forwardRef } from "react";
import { FiChevronDown } from "react-icons/fi";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: string;
  hint?: string;
  className?: string;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      error,
      hint,
      className = "",
      ...props
    },
    ref
  ) => {
    const selectClasses = `h-9 w-full appearance-none rounded-md border px-3 py-1.5 pr-8 text-sm shadow-theme-xs focus:outline-hidden ${className} ${
  props.disabled
    ? "bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
    : error
    ? "bg-transparent text-gray-900 border-error-300 focus:border-error-300 focus:ring-3 focus:ring-error-500/10 dark:border-error-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-error-800"
    : "bg-transparent text-gray-900 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
}`;


    return (
      <div className="relative">
        <select
          ref={ref}
          className={selectClasses}
          {...props}
        >
          {props.placeholder && (
            <option value="" disabled>
              {props.placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FiChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-[18px] -translate-y-1/2 text-gray-400"
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-error-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;