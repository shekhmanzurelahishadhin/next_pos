// Shared by Money Receipt and Supplier Payment (parts_bazar lot amount + "Distribute")

export const PAYMENT_TYPES = [
  { value: "1", label: "Cash" },
  { value: "2", label: "Cheque" },
  { value: "3", label: "Deposit Into Bank" },
  { value: "4", label: "Card" },
  { value: "5", label: "Adjustment" },
];

// cheque and bank deposit need a bank name
export const BANK_TYPES = ["2", "3"];

// old advance pays the invoices: lot is the advance balance, no bank, no new advance
export const ADJUSTMENT = "5";

export const paymentTypeName = (code?: string | number | null) =>
  PAYMENT_TYPES.find((t) => t.value === String(code))?.label ?? "";

export const toNum = (value: string | number | null | undefined) => {
  const n = parseFloat(String(value ?? ""));
  return isNaN(n) || n < 0 ? 0 : n;
};

// parts_bazar btnDistribute: fill the invoices oldest first, what is left is the advance
export function distributeLot(dues: number[], lot: number): { amounts: number[]; advance: number } {
  let left = lot;
  const amounts = dues.map((due) => {
    const take = Math.max(0, Math.min(due, left));
    left -= take;
    return +take.toFixed(2);
  });
  return { amounts, advance: +left.toFixed(2) };
}
