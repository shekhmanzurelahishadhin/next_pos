import React from "react";
import { UseFormRegisterReturn } from "react-hook-form";

interface TextareaProps {
  placeholder?: string;
  id?: string;
  rows?: number;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  error?: string | boolean;
  hint?: string;
  success?: boolean;
  register?: UseFormRegisterReturn;
}

const TextArea: React.FC<TextareaProps> = ({
  placeholder = "Enter your message",
  id,
  rows = 3,
  value = "",
  onChange,
  className = "",
  disabled = false,
  error = false,
  hint = "",
  success = false,
  register,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Call custom onChange if provided
    if (onChange) {
      onChange(newValue);
    }
    
    // Call register's onChange if provided
    if (register?.onChange) {
      register.onChange(e);
    }
  };

  // Determine textarea styles based on state (disabled, success, error)
  let textareaClasses = `w-full rounded-md border appearance-none px-3 py-1.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${className}`;

  // Check if we have an error (either boolean or string message)
  const hasError = Boolean(error);
  
  // Add styles for the different states
  if (disabled) {
    textareaClasses += ` bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (hasError) {
    textareaClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10 focus:border-error-300 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800`;
  } else if (success) {
    textareaClasses += ` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800`;
  } else {
    textareaClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
  }

  return (
    <div className="relative">
      <textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={textareaClasses}
        onBlur={register?.onBlur}
        ref={register?.ref}
      />

      {/* Show error message if provided as string */}
      {typeof error === 'string' && error && (
        <p className="text-xs text-error-500">
          {error}
        </p>
      )}

      {/* Show hint text if no error message */}
      {hint && !error && (
        <p className={`text-xs ${
          success ? "text-success-500" : "text-gray-500 dark:text-gray-400"
        }`}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;