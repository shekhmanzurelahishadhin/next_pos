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

// name of a payment type code, "" when not found
export function paymentTypeName(code?: string | number | null): string {
  for (const type of PAYMENT_TYPES) {
    if (type.value === String(code)) {
      return type.label;
    }
  }
  return "";
}

// a number typed in an input; empty, not a number or below 0 counts as 0
export function toNum(value: string | number | null | undefined): number {
  const number = parseFloat(String(value ?? ""));
  if (isNaN(number) || number < 0) {
    return 0;
  }
  return number;
}

// parts_bazar btnDistribute: fill the invoices oldest first, what is left is the advance
export function distributeLot(dues: number[], lot: number): { amounts: number[]; advance: number } {
  let left = lot;
  const amounts: number[] = [];

  for (const due of dues) {
    // each invoice takes its due, or what is left of the lot when that is less
    let take = due;
    if (left < take) {
      take = left;
    }
    if (take < 0) {
      take = 0;
    }

    left -= take;
    amounts.push(Number(take.toFixed(2)));
  }

  return { amounts: amounts, advance: Number(left.toFixed(2)) };
}
