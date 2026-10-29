// Shared formatting helpers. Import these instead of writing a new copy in each module.

// "2026-10-28T10:15:00Z" -> "28-10-2026". Returns "-" for empty or invalid dates.
export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();

  return `${d}-${m}-${y}`;
};

// 1250.5 -> "1,250.50". Use for every money amount so they all look the same.
export const formatMoney = (value?: number | string | null) => {
  const amount = Number(value ?? 0);
  if (isNaN(amount)) return "-";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// "2026-10-28 10:15:00" -> "28-10-2026 10:15". Returns "-" for empty values.
export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const [datePart, timePart] = value.split(" ");
  const [y, m, d] = datePart.split("-");
  const [hour, minute] = timePart ? timePart.split(":") : ["00", "00"];
  return `${d}-${m}-${y} ${hour}:${minute}`;
};
