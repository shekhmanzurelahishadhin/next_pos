// Active / Inactive / Trashed pill used in the list tables.
interface StatusBadgeProps {
  status: number; // 1 = Active, anything else = Inactive
  trashed?: boolean; // true when the row is soft-deleted (deleted_at is set)
}

export default function StatusBadge({ status, trashed = false }: StatusBadgeProps) {
  if (trashed) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
        Trashed
      </span>
    );
  }

  if (status === 1) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400">
        Active
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400">
      Inactive
    </span>
  );
}
