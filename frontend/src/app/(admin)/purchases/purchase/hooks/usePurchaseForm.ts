// hooks/usePurchaseForm.ts
// Direct purchase form, same rules as parts_bazar "Purchase Form":
// fill the order info, pick a product by part number, "Add" it to the grid, then "Create PO".
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import {
  purchaseService, calcLine, Option, ProductHit, PurchaseFormOptions, PurchaseItem, SupplierHit,
} from "@/services/purchaseService";

const today = () => new Date().toISOString().slice(0, 10);

export interface PurchaseHeader {
  purchase_date: string;
  cash_due: string;
  purchase_type: string;
  store_id: string;
  ship_by: string;
  supplier_id: number | null;
  supplier_text: string;
  supplier_due: number | null;
  payment_type: string;
  payment_amount: string;
  supplier_bill_no: string;
}

// The "Product Information" row above the grid
export interface EntryRow {
  location_id: string;
  product: ProductHit | null;
  part_text: string;
  qty: string;
  unit_price: string;
  per_kg: string;
  sell_price: string;
  weight_unit: string;
}

const emptyHeader = (): PurchaseHeader => ({
  purchase_date: today(),
  cash_due: "",
  purchase_type: "",
  store_id: "",
  ship_by: "",
  supplier_id: null,
  supplier_text: "",
  supplier_due: null,
  payment_type: "1", // parts_bazar keeps the payment type fixed on Cash
  payment_amount: "",
  supplier_bill_no: "",
});

const emptyEntry = (location_id = ""): EntryRow => ({
  location_id, product: null, part_text: "", qty: "", unit_price: "", per_kg: "", sell_price: "", weight_unit: "",
});

const num = (value: string | number | null | undefined) => {
  const n = parseFloat(String(value ?? ""));
  return isNaN(n) || n < 0 ? 0 : n;
};

export const usePurchaseForm = (editId: number | null) => {
  const [options, setOptions] = useState<PurchaseFormOptions | null>(null);
  const [stores, setStores] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [header, setHeader] = useState<PurchaseHeader>(emptyHeader);
  const [entry, setEntry] = useState<EntryRow>(emptyEntry);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [poNo, setPoNo] = useState("");
  const [savedId, setSavedId] = useState<number | null>(null); // opens the PO voucher after saving
  const partNumberRef = useRef<HTMLInputElement>(null);

  const grandTotal = +items.reduce((sum, item) => sum + item.total_purchase_price, 0).toFixed(2);
  const entryTotals = calcLine(num(entry.qty), num(entry.unit_price), num(entry.per_kg), num(entry.weight_unit));

  const loadOptions = useCallback(async () => {
    const result = await purchaseService.getFormOptions();
    setOptions(result);
    if (!editId) setPoNo(result.next_po_no);
  }, [editId]);

  const loadLocations = async (storeId: string) => {
    setLocations([]);
    if (!storeId) return;
    const res = await api.get("/configure/locations", { params: { store_id: storeId, status: 1 } });
    setLocations(res.data.data.data.map((l: any) => ({ value: String(l.id), label: l.name })));
  };

  useEffect(() => {
    loadOptions().catch(() => toast.error("Failed to load purchase form"));
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => toast.error("Failed to load stores"));
  }, [loadOptions]);

  // Edit: fill the form from a saved (pending) purchase
  useEffect(() => {
    if (!editId) return;
    purchaseService.getPurchase(editId).then(async (p) => {
      setPoNo(p.po_no);
      setHeader({
        purchase_date: String(p.purchase_date).slice(0, 10),
        cash_due: String(p.cash_due ?? ""),
        purchase_type: String(p.purchase_type ?? ""),
        store_id: String(p.store_id),
        ship_by: String(p.ship_by ?? ""),
        supplier_id: p.supplier_id,
        supplier_text: p.supplier?.name ?? "",
        supplier_due: p.supplier_due,
        payment_type: String(p.payment_type ?? "1"),
        payment_amount: Number(p.payment_amount) > 0 ? String(Number(p.payment_amount)) : "",
        supplier_bill_no: p.supplier_bill_no ?? "",
      });
      setItems(p.details.map((d: any) => ({
        product_id: d.product_id,
        part_number: d.product?.part_number ?? "",
        product_name: d.product?.name ?? "",
        unit: d.unit,
        location_id: d.location_id,
        location_name: d.location?.name ?? "",
        qty: Number(d.qty),
        unit_price: Number(d.unit_price),
        per_kg: Number(d.per_kg ?? 0),
        sell_price: Number(d.sell_price ?? 0),
        weight_unit: Number(d.weight_unit ?? 0),
        ...calcLine(Number(d.qty), Number(d.unit_price), Number(d.per_kg ?? 0), Number(d.weight_unit ?? 0)),
      })));
      await loadLocations(String(p.store_id));
    }).catch(() => toast.error("Failed to load purchase"));
  }, [editId]);

  const setHeaderField = (field: keyof PurchaseHeader, value: any) => setHeader((h) => ({ ...h, [field]: value }));
  const setEntryField = (field: keyof EntryRow, value: any) => setEntry((e) => ({ ...e, [field]: value }));

  // New store: new locations, and the product / supplier picked for the old store are cleared
  const changeStore = (storeId: string) => {
    setHeader((h) => ({ ...h, store_id: storeId, supplier_id: null, supplier_text: "", supplier_due: null }));
    setEntry(emptyEntry());
    loadLocations(storeId).catch(() => toast.error("Failed to load locations"));
  };

  // Due purchase has no payment
  const changeCashDue = (value: string) => {
    setHeader((h) => ({ ...h, cash_due: value, payment_amount: "" }));
  };

  const changePaymentAmount = (value: string) => {
    if (num(value) > grandTotal) {
      toast.error("Paid Amount must be lower or equal than grand total");
      setHeaderField("payment_amount", "0");
      return;
    }
    setHeaderField("payment_amount", value);
  };

  const selectSupplier = (supplier: SupplierHit) => {
    setHeader((h) => ({ ...h, supplier_id: supplier.id, supplier_text: supplier.name, supplier_due: supplier.due }));
  };

  const canSearchSupplier = () => {
    if (!header.store_id) {
      toast.warn("Please Select Store");
      return false;
    }
    return true;
  };

  const canSearchProduct = () => {
    if (!header.store_id) {
      toast.warn("Please Select Store");
      return false;
    }
    if (!entry.location_id) {
      toast.warn("Please Select Location!");
      return false;
    }
    return true;
  };

  // Part number picked: fill name, unit and the last prices; qty and weight price start empty
  const selectProduct = (product: ProductHit) => {
    setEntry((e) => ({
      ...e,
      product,
      part_text: product.part_number,
      unit_price: product.purchase_price ? String(product.purchase_price) : "",
      sell_price: product.sell_price ? String(product.sell_price) : "",
      weight_unit: String(product.weight ?? 0),
      qty: "",
      per_kg: "",
    }));
  };

  // "Add" button: same checks and order as parts_bazar AddNew()
  const addItem = () => {
    const fail = (message: string) => {
      setError(message);
      return false;
    };
    if (!entry.location_id) return fail("Please Select Location!");
    if (!header.purchase_type) return fail("Please Select Local /Import!");
    if (!header.cash_due) return fail("Please Select Cash/Due!");
    if (!header.purchase_date) return fail("Please Select Purchase Date!");
    if (!header.supplier_id) return fail("Please Select Supplier!");
    if (!header.store_id) return fail("Please select Store!");
    if (!entry.product) return fail("Please select a product!");
    if (entry.qty === "" || num(entry.qty) <= 0) return fail("Please enter order qty!");
    if (entry.weight_unit === "") return fail("Please enter Weight Unit !");
    if (entry.unit_price === "") return fail("Please enter purchase price!");

    if (items.some((item) => item.product_id === entry.product!.id)) {
      toast.error("This item is already added in the grid! Please try another one or change the store.");
      return false;
    }

    const qty = Math.floor(num(entry.qty));
    const unitPrice = num(entry.unit_price);
    const perKg = num(entry.per_kg);
    const weightUnit = num(entry.weight_unit);
    setItems((list) => [
      ...list,
      {
        product_id: entry.product!.id,
        part_number: entry.product!.part_number,
        product_name: entry.product!.name,
        unit: entry.product!.unit,
        location_id: Number(entry.location_id),
        location_name: locations.find((l) => l.value === entry.location_id)?.label ?? "",
        qty,
        unit_price: unitPrice,
        per_kg: perKg,
        sell_price: num(entry.sell_price),
        weight_unit: weightUnit,
        ...calcLine(qty, unitPrice, perKg, weightUnit),
      },
    ]);
    setError("");
    // keep the location for the next product
    setEntry(emptyEntry(entry.location_id));
    setTimeout(() => partNumberRef.current?.focus(), 0);
    return true;
  };

  const removeItem = (index: number) => {
    setItems((list) => list.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setHeader(emptyHeader());
    setEntry(emptyEntry());
    setItems([]);
    setLocations([]);
    setError("");
  };

  // "Create PO": same checks as parts_bazar beforeSend
  const savePurchase = async () => {
    const fail = (message: string) => setError(message);
    if (!header.cash_due) return fail("Please Select Cash/Due!");
    if (!header.purchase_type) return fail("Please Select Local /Import!");
    if (!header.purchase_date) return fail("Please Select Purchase Date!");
    if (!header.supplier_id) return fail("Please Select Supplier!");
    if (!header.store_id) return fail("Please Select Store!");
    if (header.cash_due === "1") {
      if (!header.payment_type) return toast.error("Please select a payment type!");
      if (!(num(header.payment_amount) > 0)) return toast.error("Please add payment amount!");
    }
    if (items.length === 0) return fail("Please Insert Item In List!");

    const payload = {
      purchase_date: header.purchase_date,
      cash_due: header.cash_due,
      purchase_type: header.purchase_type,
      store_id: Number(header.store_id),
      ship_by: header.ship_by || undefined,
      supplier_id: header.supplier_id,
      payment_type: header.cash_due === "1" ? header.payment_type : undefined,
      payment_amount: header.cash_due === "1" ? num(header.payment_amount) : null,
      supplier_bill_no: header.supplier_bill_no || undefined,
      items: items.map(({ product_id, location_id, qty, unit_price, per_kg, sell_price, weight_unit }) => ({
        product_id, location_id, qty, unit_price, per_kg, sell_price, weight_unit,
      })),
    };

    try {
      setSaving(true);
      setError("");
      const saved = editId
        ? await purchaseService.updatePurchase(editId, payload)
        : await purchaseService.createPurchase(payload);
      toast.success(editId ? "Purchase updated successfully." : "Data saved successfully.");
      if (!editId) {
        resetForm();
        loadOptions();
      }
      setSavedId(saved.id);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstError = errors && Object.values(errors)[0];
      setError(
        (Array.isArray(firstError) ? firstError[0] : null) ||
        err?.response?.data?.message ||
        "Data not saved. Please solve the above errors!"
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    options, stores, locations, header, entry, items, error, saving, poNo, savedId, grandTotal, entryTotals, partNumberRef,
    setHeaderField, setEntryField, changeStore, changeCashDue, changePaymentAmount, selectSupplier, selectProduct,
    canSearchSupplier, canSearchProduct, addItem, removeItem, savePurchase, setSavedId,
  };
};
