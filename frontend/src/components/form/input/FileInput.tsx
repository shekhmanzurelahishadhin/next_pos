import React, { FC } from "react";

interface FileInputProps {
  id?: string;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  accept?: string;
  error?: string | boolean;
}

const FileInput: FC<FileInputProps> = ({
  id,
  className = "",
  onChange,
  required = false,
  disabled = false,
  accept,
  error = false,
}) => {
  const hasError = Boolean(error);

  let inputClasses = `
    h-9 w-full overflow-hidden rounded-md border bg-transparent text-sm shadow-theme-xs transition-colors
    file:mr-5 file:rounded-l-lg file:border-0 file:border-r file:border-solid
    file:py-3 file:pl-3.5 file:pr-3 file:text-sm
    focus:outline-hidden
  `;

  if (disabled) {
    inputClasses += `
      cursor-not-allowed border-gray-300 text-gray-400
      file:cursor-not-allowed file:bg-gray-100 file:text-gray-400
      dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500
      dark:file:bg-gray-800 dark:file:text-gray-500
    `;
  } else if (hasError) {
    inputClasses += `
      border-error-500 text-error-800
      focus:ring-3 focus:ring-error-500/10
      file:border-error-300 file:text-error-700
      dark:border-error-500 dark:text-error-400
    `;
  } else {
    inputClasses += `
      border-gray-300 text-gray-500
      file:cursor-pointer file:border-gray-200 file:bg-gray-50 file:text-gray-700
      hover:file:bg-gray-100
      focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10
      dark:border-gray-700 dark:bg-gray-900 dark:text-white/90
      dark:file:border-gray-800 dark:file:bg-white/[0.03] dark:file:text-gray-400
    `;
  }

  return (
    <div className="relative">
      <input
        type="file"
        id={id}
        required={required}
        disabled={disabled}
        accept={accept}
        className={`${inputClasses} ${className}`}
        onChange={onChange}
      />

      {/* Error message */}
      {typeof error === "string" && error && (
        <p className="mt-1.5 text-xs text-error-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileInput;
