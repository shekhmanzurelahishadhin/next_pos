// components/skeletons/RolePermissionsSkeleton.tsx
import React from "react";
import ComponentCard from "@/components/common/ComponentCard";

const RolePermissionsSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center space-x-2">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 w-4 text-gray-400">/</div>
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Header Card Skeleton */}
      <ComponentCard
        title="Assign Permissions"
        desc="Loading permissions..."
        className="border-t-4 border-t-blue-500"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-6 w-48 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </ComponentCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filter Section Skeleton */}
        <div className="lg:col-span-1">
          <ComponentCard title="Filter Permissions" className="h-fit">
            <div className="space-y-5">
              {/* Module Filter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>

              {/* Menu Filter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>

              {/* Sub Menu Filter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>

              {/* Filter Stats Skeleton */}
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div className="h-6 w-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-9 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-9 w-full bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* Permissions List Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Available Permissions Skeleton */}
          <ComponentCard title="Available Permissions">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-6 w-40 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ComponentCard>

          {/* Selected Permissions Skeleton */}
          <ComponentCard title="Selected Permissions">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-6 w-40 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>

            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 w-56 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex justify-end gap-3 mt-6 pt-6">
              <div className="h-10 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-10 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsSkeleton;