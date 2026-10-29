import Link from "next/link";
import React from "react";

interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface BreadcrumbProps {
  // For backward compatibility
  pageTitle?: string;
  // New dynamic prop
  items?: BreadcrumbItem[];
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ 
  pageTitle, 
  items = [] 
}) => {
  // If items array is provided, use it
  // If only pageTitle is provided (backward compatibility), create a single item array
  const breadcrumbItems = items.length > 0 
    ? items 
    : pageTitle 
      ? [{ title: pageTitle }] 
      : [];

  const currentPageTitle = pageTitle || 
    (breadcrumbItems.length > 0 ? breadcrumbItems[breadcrumbItems.length - 1].title : "");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
        {currentPageTitle}
      </h2>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5">
          {/* Home link */}
          <li>
            <Link
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              href="/"
            >
              Home
              <ChevronIcon />
            </Link>
          </li>

          {/* Dynamic breadcrumb items */}
          {breadcrumbItems.slice(0, -1).map((item, index) => (
            <li key={index}>
              {item.href ? (
                <Link
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  href={item.href}
                >
                  {item.title}
                  <ChevronIcon />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  {item.title}
                  <ChevronIcon />
                </span>
              )}
            </li>
          ))}

          {/* Current page (last item) */}
          {breadcrumbItems.length > 0 && (
            <li className="text-xs text-gray-800 dark:text-white/90">
              {breadcrumbItems[breadcrumbItems.length - 1].title}
            </li>
          )}
        </ol>
      </nav>
    </div>
  );
};

const ChevronIcon = () => (
  <svg
    className="stroke-current"
    width="14"
    height="14"
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
      stroke=""
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default PageBreadcrumb;