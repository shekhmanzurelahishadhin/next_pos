// Small helpers used by many pages: select options, API filters and API error messages
import { api } from "@/lib/api";

export type Option = { value: string; label: string };

// today as "2026-11-03"
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// active rows of a configure list (stores, companies, categories ...) as select options
export async function loadOptions(url: string, extraParams: Record<string, string> = {}): Promise<Option[]> {
  const res = await api.get(url, { params: { status: 1, ...extraParams } });
  const list: { id: number; name: string }[] = res.data.data.data;

  const options: Option[] = [];
  for (const item of list) {
    options.push({ value: String(item.id), label: item.name });
  }
  return options;
}

// label of the option with this value, "—" when not found
export function optionLabel(options: Option[] | undefined, value: string | number): string {
  if (!options) {
    return "—";
  }
  for (const option of options) {
    if (option.value === String(value)) {
      return option.label;
    }
  }
  return "—";
}

// the filters without the empty ones, to send to the API
export function removeEmpty(filters: Record<string, string | number>): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const name in filters) {
    const value = filters[name];
    if (value !== "" && value !== undefined && value !== null) {
      params[name] = value;
    }
  }
  return params;
}

// only the named filters that have a value (0 and "" are left out), to send to the API
export function pickFilters(filters: object, names: string[]): Record<string, string | number> {
  const values = filters as Record<string, string | number | undefined>;
  const params: Record<string, string | number> = {};
  for (const name of names) {
    const value = values[name];
    if (value) {
      params[name] = value;
    }
  }
  return params;
}

// The message to show for a failed API call:
// the first validation error, or else the message the API sent, or else the fallback
export function apiErrorMessage(err: unknown, fallback: string): string {
  const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const data = error.response ? error.response.data : undefined;
  if (!data) {
    return fallback;
  }

  if (data.errors) {
    for (const field in data.errors) {
      const messages = data.errors[field];
      if (Array.isArray(messages) && messages.length > 0) {
        return messages[0];
      }
    }
  }

  if (data.message) {
    return data.message;
  }
  return fallback;
}

// The validation errors of a failed save as { field: first message }, empty when there are none
export function apiFieldErrors(err: unknown): Record<string, string> {
  const error = err as { response?: { data?: { errors?: Record<string, string[] | string> } } };
  const fieldErrors: Record<string, string> = {};
  const errors = error.response?.data?.errors;
  if (!errors) {
    return fieldErrors;
  }

  for (const field in errors) {
    const messages = errors[field];
    if (Array.isArray(messages)) {
      fieldErrors[field] = messages[0];
    } else {
      fieldErrors[field] = messages;
    }
  }
  return fieldErrors;
}

// a number typed in an input; empty, not a number or below 0 counts as 0
export function inputNumber(value: string | number | null | undefined): number {
  const number = parseFloat(String(value ?? ""));
  if (isNaN(number) || number < 0) {
    return 0;
  }
  return number;
}

// stop the mouse wheel from changing a number input
export function blurOnWheel(e: React.WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}
