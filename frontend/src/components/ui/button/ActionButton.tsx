"use client";
import React from "react";
import { IconType } from "react-icons";
import * as Icons from "@/icons/index";

interface ActionButton {
  icon: IconType;
  onClick: (row: any) => void;
  variant?: 
    | "primary"
    | "secondary"
    | "danger"
    | "success"
    | "warning"
    | "info"
    | "ghost"
    | "outline";
  size?: "sm" | "md" | "lg";
  show?: (row: any) => boolean;
  tooltip?: string;
}

interface Props {
  row: any;
  buttons: ActionButton[];
}

const ActionButtons: React.FC<Props> = ({ row, buttons }) => {
  const variantColors: Record<string, string> = {
    primary: "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400",
    secondary: "text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400",
    danger: "text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400",
    success: "text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400",
    warning: "text-gray-500 hover:text-yellow-600 dark:text-gray-400 dark:hover:text-yellow-400",
    info: "text-gray-500 hover:text-blue-400 dark:text-gray-400 dark:hover:text-blue-300",
    ghost: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300",
    outline: "text-gray-500 border border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-gray-300",
  };

  const sizes: Record<string, string> = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const iconSizes: Record<string, string> = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="flex items-center gap-0.5">
      {buttons.map((btn, index) => {
        if (btn.show && !btn.show(row)) return null;

        const colorClass = variantColors[btn.variant || "primary"];
        const sizeClass = sizes[btn.size || "sm"];
        const iconSizeClass = iconSizes[btn.size || "sm"];
        const IconComponent = btn.icon;

        return (
          <button
            key={index}
            onClick={() => btn.onClick(row)}
            className={`${colorClass} ${sizeClass} rounded transition-colors flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800`}
            title={btn.tooltip}
          >
            <IconComponent className={iconSizeClass} />
          </button>
        );
      })}
    </div>
  );
};

export default ActionButtons;