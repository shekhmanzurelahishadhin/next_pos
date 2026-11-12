// Small helpers used by every report page
import { today } from "@/lib/options";

// the select option helpers are shared with the other pages
export { loadOptions, today } from "@/lib/options";
export type { Option } from "@/lib/options";

// first day of this month as "2026-11-01"
export function firstDayOfMonth(): string {
  return today().slice(0, 8) + "01";
}

// 1250.5 -> "1,251" (reports show money without decimals, like parts_bazar)
export function reportMoney(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

// 12.345 -> "12.35", 12 -> "12"
export function reportQty(qty: number): string {
  return Number(qty.toFixed(2)).toLocaleString("en-US");
}

// only the filled fields of the search form, to send to the API
export function filledFields(form: Record<string, string>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const name in form) {
    if (form[name] !== "") {
      params[name] = form[name];
    }
  }
  return params;
}

// the message the API sent back with an error
export function apiErrorMessage(err: unknown): string {
  const error = err as { response?: { data?: { message?: string } } };
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  return "Failed to load report";
}

// lines under the report title, one for each picked filter: "Customer: Hafij"
export function labelLines(labels: Record<string, string> | []): string[] {
  const lines: string[] = [];
  for (const [label, value] of Object.entries(labels)) {
    lines.push(`${label}: ${value}`);
  }
  return lines;
}
