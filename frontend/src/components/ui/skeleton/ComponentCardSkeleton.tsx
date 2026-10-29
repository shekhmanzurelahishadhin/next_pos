"use client";

import React from "react";

interface ComponentCardSkeletonProps {
  className?: string;
  showAddButton?: boolean;
  headerHeight?: string; // optional custom height for header skeleton
  bodyHeight?: string; // optional custom height for body skeleton
}

const ComponentCardSkeleton: React.FC<ComponentCardSkeletonProps> = ({
  className = "",
  showAddButton = false,
  headerHeight = "h-6",
  bodyHeight = "h-40",
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className} animate-pulse`}
    >
      {/* Card Header Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-6 pt-6 sm:py-5">
        <div className="space-y-2 w-full sm:w-auto">
          <div className={`${headerHeight} bg-gray-200 dark:bg-gray-700 rounded-md w-40`} />
          <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded-md mt-1" />
        </div>
        {showAddButton && (
          <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
        )}
      </div>

      {/* Card Body Skeleton */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className={`${bodyHeight} bg-gray-200 dark:bg-gray-700 rounded-md`} />
      </div>
    </div>
  );
};

export default ComponentCardSkeleton;
