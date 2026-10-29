import React from "react";
import Button from "../ui/button/Button";
import { FiPlus } from "../../icons/index";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  showAddButton?: boolean;
  openModal?: () => void;
  buttonLabel?: string;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  showAddButton = false,
  openModal,
  buttonLabel = "Add New",
}) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 truncate dark:text-white/90">
            {title}
          </h3>

          {desc && (
            <p className="text-xs text-gray-500 truncate dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
        {showAddButton && (
          <Button size="sm" onClick={openModal} className="shrink-0">
            <FiPlus /> {buttonLabel}
          </Button>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 sm:p-4">
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
