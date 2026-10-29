import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps {
  children: ReactNode; // Button text or content
  type?: "button" | "submit" | "reset"; // Button type
  size?: "sm" | "md"; // Button size
  variant?: "primary" | "outline"; // Button variant
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  onClick?: () => void; // Click handler
  disabled?: boolean; // Disabled state
  className?: string; // Custom classes
  tooltip?: string; // Tooltip text
  form?: string; // ID of the form this button submits (native HTML support)
}

const Button: React.FC<ButtonProps> = ({
  children,
  type = "button",
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  tooltip,
  form,
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-9 px-4 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
  };

  return (
    <button title={tooltip}
      // twMerge lets a caller's className (e.g. h-8 w-8 p-0) override the size defaults
      className={twMerge(
        "inline-flex items-center justify-center font-medium gap-1.5 rounded-md transition whitespace-nowrap",
        sizeClasses[size],
        variantClasses[variant],
        disabled ? "cursor-not-allowed opacity-50" : "",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      type={type}
      form={form} 
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
