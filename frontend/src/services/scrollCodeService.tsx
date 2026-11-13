import { api } from "@/lib/api";

export type ScrollCodeType = "month" | "year" | "prefix";

export interface ScrollCodeItem {
  key: string;   // month 1-12, digit 0-9 or document type
  label: string;
  code: string;
}

export type ScrollCodes = Record<ScrollCodeType, ScrollCodeItem[]>;

// the saved code of one item, "" when it has none
function findCode(codes: ScrollCodes, type: ScrollCodeType, key: string): string {
  for (const item of codes[type]) {
    if (item.key === key) {
      return item.code ?? "";
    }
  }
  return "";
}

// Document number = prefix + month code + 3 digit serial + year code, e.g. SID001AR
export function buildScrollNo(codes: ScrollCodes, prefixKey: string, date = new Date(), serial = 1) {
  // each of the last 2 digits of the year has its own code (the digit itself when it has none)
  let yearCode = "";
  for (const digit of String(date.getFullYear()).slice(-2)) {
    const code = findCode(codes, "year", digit);
    if (code) {
      yearCode += code;
    } else {
      yearCode += digit;
    }
  }

  const prefix = findCode(codes, "prefix", prefixKey);
  const monthCode = findCode(codes, "month", String(date.getMonth() + 1));
  return prefix + monthCode + String(serial).padStart(3, "0") + yearCode;
}

class ScrollCodeService {
  async getCodes(): Promise<ScrollCodes> {
    const response = await api.get("/configure/scroll-codes");
    return response.data.data;
  }

  // codes = { key: code }
  async saveCodes(type: ScrollCodeType, codes: Record<string, string>): Promise<ScrollCodes> {
    const response = await api.put("/configure/scroll-codes", { type: type, codes: codes });
    return response.data.data;
  }
}

export const scrollCodeService = new ScrollCodeService();
