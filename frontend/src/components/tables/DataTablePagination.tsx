"use client";

import { Table } from "@tanstack/react-table";
import Button from "../ui/button/Button";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  total?: number; // Add total prop
}

export function DataTablePagination<TData>({
  table,
  total, // Receive total from parent
}: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();

  // Calculate showing range
  const startItem = total ? (currentPage * pageSize) + 1 : 0;
  const endItem = Math.min((currentPage + 1) * pageSize, total || 0);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (pageCount <= maxVisiblePages) {
      // Show all pages if total pages are less than or equal to maxVisiblePages
      for (let i = 0; i < pageCount; i++) {
        pages.push(i);
      }
    } else {
      // Show limited pages with ellipsis logic
      let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;

      if (endPage >= pageCount) {
        endPage = pageCount - 1;
        startPage = Math.max(0, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const navButton = "h-7 w-7 p-0 text-xs";

  return (
    <div className="flex flex-col items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 sm:flex-row">
      {/* Left side: showing info */}
      <div>
        Showing <span className="font-medium text-gray-700 dark:text-gray-300">{startItem}–{endItem}</span>
        {total ? <> of <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span></> : null} entries
      </div>

      {/* Right side: pagination controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Rows per page */}
        <label className="flex items-center gap-1.5">
          Rows
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-7 rounded-md border border-gray-300 bg-white px-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {[10, 20, 30, 50, 100].map((pageSize) => (
              <option className="text-gray-700 dark:bg-gray-900 dark:text-gray-400" key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </label>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className={`hidden md:flex ${navButton}`}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            tooltip="First page"
          >
            {"«"}
          </Button>
          <Button
            variant="outline"
            className={navButton}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            tooltip="Previous page"
          >
            {"‹"}
          </Button>

          {pageNumbers.map((pageIndex) => (
            <Button
              key={pageIndex}
              variant={currentPage === pageIndex ? "primary" : "outline"}
              className={navButton}
              onClick={() => table.setPageIndex(pageIndex)}
            >
              {pageIndex + 1}
            </Button>
          ))}

          <Button
            variant="outline"
            className={navButton}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            tooltip="Next page"
          >
            {"›"}
          </Button>
          <Button
            variant="outline"
            className={`hidden md:flex ${navButton}`}
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            tooltip="Last page"
          >
            {"»"}
          </Button>
        </div>
      </div>
    </div>
  );
}
