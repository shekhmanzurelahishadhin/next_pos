import { api } from "@/lib/api";

export type ScrollCodeType = "month" | "year" | "prefix";

export interface ScrollCodeItem {
  key: string;   // month 1-12, digit 0-9 or document type
  label: string;
  code: string;
}

export type ScrollCodes = Record<ScrollCodeType, ScrollCodeItem[]>;

// Document number = prefix + month code + 3 digit serial + year code, e.g. SID001AR
export const buildScrollNo = (codes: ScrollCodes, prefixKey: string, date = new Date(), serial = 1) => {
  const find = (type: ScrollCodeType, key: string) => codes[type].find((item) => item.key === key)?.code ?? "";
  const yearCode = String(date.getFullYear()).slice(-2).split("").map((digit) => find("year", digit) || digit).join("");
  return find("prefix", prefixKey) + find("month", String(date.getMonth() + 1)) + String(serial).padStart(3, "0") + yearCode;
};

class ScrollCodeService {
  async getCodes(): Promise<ScrollCodes> {
    const response = await api.get("/configure/scroll-codes");
    return response.data.data;
  }

  // codes = { key: code }
  async saveCodes(type: ScrollCodeType, codes: Record<string, string>): Promise<ScrollCodes> {
    const response = await api.put("/configure/scroll-codes", { type, codes });
    return response.data.data;
  }
}

export const scrollCodeService = new ScrollCodeService();
