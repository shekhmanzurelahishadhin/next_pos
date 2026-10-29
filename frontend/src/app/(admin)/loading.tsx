// Shown instantly on navigation while the next page's code loads,
// so clicking a menu item never feels frozen.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-48 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
          <div className="h-8 w-24 rounded-md bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="p-4 space-y-2 border-t border-gray-100 dark:border-gray-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 rounded bg-gray-100 dark:bg-gray-800/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
