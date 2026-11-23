// ACTIVE / USED / CANCELED pill of a cheque leaf
import { CHEQUE_ACTIVE, CHEQUE_USED, chequeStatusName } from "@/services/chequeBookService";

export function ChequeStatusBadge({ status }: { status: number | null }) {
  let colorClass = "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400";
  if (status === CHEQUE_ACTIVE) {
    colorClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  } else if (status === CHEQUE_USED) {
    colorClass = "bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400";
  }
  return <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + colorClass}>{chequeStatusName(status)}</span>;
}
