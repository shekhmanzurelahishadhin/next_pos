// hooks/useSaleForm.ts
// Sales form, same rules as parts_bazar "SALES FORM":
// fill order and customer, pick a barcode, "Add" it to the grid, then "Create SO".
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { useAlert } from "@/hooks/useAlert";
import { BarcodeHit, CustomerHit, Option, saleService, SaleFormOptions, SaleItem } from "@/services/saleService";

const today = () => new Date().toISOString().slice(0, 10);
const CASH = "1";
const DUE = "2";

export interface SaleHeader {
  order_date: string;
  cash_due: string;
  memo_no: string;
  due_limit_exceed_accept: string; // 1 Yes, 2 No
  company_id: string;
  customer_id: number | null;
  customer_text: string;
  customer_due: number | null;
  mobile_no: string;
  car_name: string;
  car_no: string;
  due_limit: number | null;
  received_type: string;
  received_amount: string;
}

// The "Product Information" row above the grid
export interface EntryRow {
  barcode_text: string;
  item: BarcodeHit | null;
  qty: string;
  sell_price: string;
}

const emptyHeader = (company_id = ""): SaleHeader => ({
  order_date: today(),
  cash_due: "",
  memo_no: "",
  due_limit_exceed_accept: "1",
  company_id,
  customer_id: null,
  customer_text: "",
  customer_due: null,
  mobile_no: "",
  car_name: "",
  car_no: "",
  due_limit: null,
  received_type: CASH, // parts_bazar keeps it fixed on Cash
  received_amount: "",
});

const emptyEntry = (): EntryRow => ({ barcode_text: "", item: null, qty: "", sell_price: "" });

const num = (value: string | number | null | undefined) => {
  const n = parseFloat(String(value ?? ""));
  return isNaN(n) || n < 0 ? 0 : n;
};

export const lineAmount = (item: { qty: number; sell_price: number }) => +(item.qty * item.sell_price).toFixed(2);

export const useSaleForm = (editId: number | null) => {
  const { confirm } = useAlert();
  const [options, setOptions] = useState<SaleFormOptions | null>(null);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [header, setHeader] = useState<SaleHeader>(emptyHeader);
  const [entry, setEntry] = useState<EntryRow>(emptyEntry);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null); // opens the invoice after saving
  const barcodeRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const grandTotal = +items.reduce((sum, item) => sum + lineAmount(item), 0).toFixed(2);

  useEffect(() => {
    saleService.getFormOptions().then(setOptions).catch(() => toast.error("Failed to load sales form"));
    api.get("/configure/companies", { params: { status: 1, per_page: null } })
      .then((res) => {
        const list = res.data.data.data.map((c: any) => ({ value: String(c.id), label: c.name }));
        setCompanies(list);
        // one company: pick it, like parts_bazar does for a user of one company
        if (list.length === 1 && !editId) setHeader((h) => ({ ...h, company_id: list[0].value }));
      })
      .catch(() => toast.error("Failed to load companies"));
  }, [editId]);

  // Edit: fill the form from a saved (pending) SO
  useEffect(() => {
    if (!editId) return;
    saleService.getSale(editId).then((s) => {
      setHeader({
        order_date: String(s.order_date).slice(0, 10),
        cash_due: String(s.cash_due ?? ""),
        memo_no: s.memo_no ?? "",
        due_limit_exceed_accept: String(s.due_limit_exceed_accept ?? "1"),
        company_id: String(s.company_id),
        customer_id: s.customer_id,
        customer_text: s.customer?.name ?? "",
        customer_due: s.customer_due,
        mobile_no: s.mobile_no ?? "",
        car_name: s.car_name ?? "",
        car_no: s.car_no ?? "",
        due_limit: Number(s.customer?.credit_limit ?? 0),
        received_type: String(s.received_type ?? CASH),
        received_amount: Number(s.received_amount) > 0 ? String(Number(s.received_amount)) : "",
      });
      setItems(s.details.map((d: any) => ({
        barcode: d.barcode,
        product_id: d.product_id,
        product_name: d.product?.name ?? "",
        part_number: d.product?.part_number ?? "",
        unit: d.unit,
        store_id: d.store_id,
        store_name: d.store?.name ?? "",
        location_id: d.location_id,
        location_name: d.location?.name ?? "",
        purchase_price: Number(d.purchase_price),
        stock: Number(d.qty), // refreshed below with the real stock
        qty: Number(d.qty),
        sell_price: Number(d.sell_price),
      })));
      // stock left for each barcode, not counting this SO itself
      s.details.forEach((d: any) => {
        saleService.searchBarcodes(d.barcode, s.company_id, editId).then((hits) => {
          const hit = hits.find((h) => h.barcode === d.barcode);
          if (hit) setItems((list) => list.map((i) => (i.barcode === d.barcode ? { ...i, stock: hit.stock } : i)));
        });
      });
    }).catch(() => toast.error("Failed to load sale"));
  }, [editId]);

  const setHeaderField = (field: keyof SaleHeader, value: any) => setHeader((h) => ({ ...h, [field]: value }));
  const setEntryField = (field: keyof EntryRow, value: any) => setEntry((e) => ({ ...e, [field]: value }));

  // Due sale has no money received
  const changeCashDue = (value: string) => {
    setHeader((h) => ({ ...h, cash_due: value, received_amount: "" }));
  };

  const selectCustomer = (customer: CustomerHit) => {
    setHeader((h) => ({
      ...h,
      customer_id: customer.id,
      customer_text: `${customer.name}${customer.phone ? `(${customer.phone})` : ""}`,
      customer_due: customer.due,
      mobile_no: customer.phone ?? "",
      car_name: customer.car_name ?? h.car_name,
      due_limit: customer.due_limit,
    }));
  };

  const canSearchCustomer = () => {
    if (!header.company_id) {
      toast.warn("Please Select Company");
      return false;
    }
    return true;
  };

  const canSearchBarcode = () => {
    if (!header.company_id) {
      toast.warn("Please Select Company First!");
      return false;
    }
    return true;
  };

  // Barcode picked: store, location, product, stock and purchase price come from it
  const selectBarcode = (item: BarcodeHit) => {
    setEntry((e) => ({ ...e, item, barcode_text: item.barcode, qty: "" }));
    setTimeout(() => qtyRef.current?.focus(), 0);
  };

  const changeEntryQty = (value: string) => {
    if (entry.item && num(value) > entry.item.stock) {
      toast.error("Quantity can not be grater than available stock");
      setEntryField("qty", "");
      return;
    }
    setEntryField("qty", value);
  };

  // "Add" button: same checks and order as parts_bazar AddNew()
  const addItem = () => {
    const fail = (message: string) => {
      toast.error(message);
      return false;
    };
    if (!header.order_date) return fail("Please Select Order Date!");
    if (!header.cash_due) return fail("Please Select Cash / Due!");
    if (!header.customer_id) return fail("Please Select Customer!");
    if (!entry.item) return fail("Please Enter Code!");
    if (!header.company_id) return fail("Please Select Company!");
    if (entry.qty === "" || num(entry.qty) <= 0) return fail("Please Insert Qty!");
    if (entry.sell_price === "") return fail("Please Insert Sell Price");
    if (entry.item.stock <= 0) return fail("Stock is not available");
    if (items.some((item) => item.barcode === entry.item!.barcode)) return fail("This barcode is already added in the grid!.");

    setItems((list) => [...list, { ...entry.item!, qty: num(entry.qty), sell_price: num(entry.sell_price) }]);
    setError("");
    setEntry(emptyEntry());
    setTimeout(() => barcodeRef.current?.focus(), 0);
    return true;
  };

  // qty / price typed in the grid; qty can not pass the stock
  const changeItem = (index: number, field: "qty" | "sell_price", value: string) => {
    setItems((list) => list.map((item, i) => {
      if (i !== index) return item;
      if (field === "qty" && (num(value) > item.stock || num(value) <= 0)) {
        if (num(value) > item.stock) toast.error("Quantity is less than stock");
        return { ...item, qty: 1 };
      }
      return { ...item, [field]: num(value) };
    }));
  };

  const removeItem = (index: number) => setItems((list) => list.filter((_, i) => i !== index));

  const resetForm = () => {
    setHeader(emptyHeader(companies.length === 1 ? companies[0].value : ""));
    setEntry(emptyEntry());
    setItems([]);
    setError("");
  };

  // "Cancel" button of parts_bazar: clear everything after asking
  const cancelForm = async () => {
    const result = await confirm({ title: "Cancel?", text: "Are you sure to cancel?" });
    if (result.isConfirmed) resetForm();
  };

  // "Create SO": same checks as parts_bazar beforeSend
  const saveSale = async () => {
    if (!header.order_date) return toast.error("Please Select Order Date!");
    if (!header.cash_due) return toast.error("Please Select Cash / Due!");
    if (!header.customer_id) return toast.error("Please Select Customer!");
    if (header.cash_due === CASH) {
      if (!header.received_type) return toast.error("Please select a received type!");
      if (!(num(header.received_amount) > 0)) return toast.error("Please add received amount!");
    }
    if (header.cash_due === DUE && header.due_limit_exceed_accept === "2" && (header.due_limit ?? 0) < grandTotal) {
      return setError("Sorry! Due Limit Exceed!");
    }
    if (items.length === 0) return toast.error("Please add at least one Item!");

    const payload = {
      company_id: Number(header.company_id),
      order_date: header.order_date,
      cash_due: header.cash_due,
      memo_no: header.memo_no || undefined,
      customer_id: header.customer_id,
      mobile_no: header.mobile_no || undefined,
      car_name: header.car_name || undefined,
      car_no: header.car_no || undefined,
      due_limit_exceed_accept: header.due_limit_exceed_accept,
      received_type: header.cash_due === CASH ? header.received_type : undefined,
      received_amount: header.cash_due === CASH ? num(header.received_amount) : null,
      items: items.map(({ barcode, qty, sell_price }) => ({ barcode, qty, sell_price })),
    };

    try {
      setSaving(true);
      setError("");
      const saved = editId ? await saleService.updateSale(editId, payload) : await saleService.createSale(payload);
      toast.success(editId ? "Sale updated successfully." : "Data saved successfully.");
      if (!editId) resetForm();
      setSavedId(saved.id);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstError = errors && Object.values(errors)[0];
      setError(
        (Array.isArray(firstError) ? firstError[0] : null) ||
        err?.response?.data?.message ||
        "Data not saved. Pleae solve the above errors."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeDate = useCallback((_dates: Date[], dateStr: string) => setHeader((h) => ({ ...h, order_date: dateStr })), []);

  return {
    options, companies, header, entry, items, error, saving, savedId, grandTotal, barcodeRef, qtyRef,
    setHeaderField, setEntryField, setSavedId, setEntry, changeCashDue, changeDate, selectCustomer, canSearchCustomer,
    canSearchBarcode, selectBarcode, changeEntryQty, addItem, changeItem, removeItem, cancelForm, saveSale,
    resetEntry: () => setEntry(emptyEntry()),
  };
};
