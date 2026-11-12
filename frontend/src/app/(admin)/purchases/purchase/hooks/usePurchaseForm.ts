// hooks/usePurchaseForm.ts
// Direct purchase form, same rules as parts_bazar "Purchase Form":
// fill the order info, pick a product by part number, "Add" it to the grid, then "Create PO".
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { apiErrorMessage, inputNumber, loadOptions, today } from "@/lib/options";
import {
  purchaseService, calcLine, Option, ProductHit, PurchaseFormOptions, PurchaseItem, PurchasePayload, SupplierHit,
} from "@/services/purchaseService";

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

export const LOCAL = "1"; // local_import lookup code for "Local"
const CASH = "1"; // cash_due lookup code for "Cash"

function emptyHeader(): PurchaseHeader {
  return {
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
  };
}

function emptyEntry(locationId = ""): EntryRow {
  return {
    location_id: locationId,
    product: null,
    part_text: "",
    qty: "",
    unit_price: "",
    per_kg: "",
    sell_price: "",
    weight_unit: "",
  };
}

export const usePurchaseForm = (editId: number | null) => {
  const [options, setOptions] = useState<PurchaseFormOptions | null>(null);
  const [stores, setStores] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [header, setHeader] = useState<PurchaseHeader>(emptyHeader());
  const [entry, setEntry] = useState<EntryRow>(emptyEntry());
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null); // opens the PO voucher after saving
  const partNumberRef = useRef<HTMLInputElement>(null);

  // grand total of the grid
  let grandTotal = 0;
  for (const item of items) {
    grandTotal += item.total_purchase_price;
  }
  grandTotal = Number(grandTotal.toFixed(2));

  // totals of the row that is being typed
  const entryTotals = calcLine(inputNumber(entry.qty), inputNumber(entry.unit_price), inputNumber(entry.per_kg), inputNumber(entry.weight_unit));

  async function loadLocations(storeId: string) {
    setLocations([]);
    if (!storeId) {
      return;
    }
    const list = await loadOptions("/configure/locations", { store_id: storeId });
    setLocations(list);
  }

  // dropdown lists of the form
  useEffect(() => {
    purchaseService.getFormOptions()
      .then(setOptions)
      .catch(() => toast.error("Failed to load purchase form"));
    loadOptions("/configure/stores")
      .then(setStores)
      .catch(() => toast.error("Failed to load stores"));
  }, []);

  // Edit: fill the form from a saved (pending) purchase
  useEffect(() => {
    if (!editId) {
      return;
    }
    fillFromPurchase(editId).catch(() => toast.error("Failed to load purchase"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function fillFromPurchase(purchaseId: number) {
    const purchase = await purchaseService.getPurchase(purchaseId);

    let paymentAmount = "";
    if (Number(purchase.payment_amount) > 0) {
      paymentAmount = String(Number(purchase.payment_amount));
    }

    setHeader({
      purchase_date: String(purchase.purchase_date).slice(0, 10),
      cash_due: String(purchase.cash_due ?? ""),
      purchase_type: String(purchase.purchase_type ?? ""),
      store_id: String(purchase.store_id),
      ship_by: String(purchase.ship_by ?? ""),
      supplier_id: purchase.supplier_id,
      supplier_text: purchase.supplier ? purchase.supplier.name : "",
      supplier_due: purchase.supplier_due,
      payment_type: String(purchase.payment_type ?? "1"),
      payment_amount: paymentAmount,
      supplier_bill_no: purchase.supplier_bill_no ?? "",
    });

    const savedItems: PurchaseItem[] = [];
    for (const detail of purchase.details) {
      const qty = Number(detail.qty);
      const unitPrice = Number(detail.unit_price);
      const perKg = Number(detail.per_kg ?? 0);
      const weightUnit = Number(detail.weight_unit ?? 0);
      const totals = calcLine(qty, unitPrice, perKg, weightUnit);

      savedItems.push({
        product_id: detail.product_id,
        part_number: detail.product ? detail.product.part_number : "",
        product_name: detail.product ? detail.product.name : "",
        unit: detail.unit,
        location_id: detail.location_id,
        location_name: detail.location ? detail.location.name : "",
        qty: qty,
        unit_price: unitPrice,
        per_kg: perKg,
        sell_price: Number(detail.sell_price ?? 0),
        weight_unit: weightUnit,
        total_unit_price: totals.total_unit_price,
        total_product_price: totals.total_product_price,
        total_weight: totals.total_weight,
        total_weight_amount: totals.total_weight_amount,
        total_purchase_price: totals.total_purchase_price,
      });
    }
    setItems(savedItems);

    await loadLocations(String(purchase.store_id));
  }

  function setHeaderField(field: keyof PurchaseHeader, value: string | number | null) {
    setHeader((old) => ({ ...old, [field]: value }));
  }

  function setEntryField(field: keyof EntryRow, value: string | ProductHit | null) {
    setEntry((old) => ({ ...old, [field]: value }));
  }

  // New store: new locations, and the product / supplier picked for the old store are cleared
  function changeStore(storeId: string) {
    setHeader((old) => ({ ...old, store_id: storeId, supplier_id: null, supplier_text: "", supplier_due: null }));
    setEntry(emptyEntry());
    loadLocations(storeId).catch(() => toast.error("Failed to load locations"));
  }

  // A due purchase has no payment
  function changeCashDue(value: string) {
    setHeader((old) => ({ ...old, cash_due: value, payment_amount: "" }));
  }

  // A local purchase has no weight cost: parts_bazar clears PER KG and makes it read only
  function changePurchaseType(value: string) {
    setHeaderField("purchase_type", value);
    if (value === LOCAL) {
      setEntryField("per_kg", "");
    }
  }

  function changePaymentAmount(value: string) {
    if (inputNumber(value) > grandTotal) {
      toast.error("Paid Amount must be lower or equal than grand total");
      setHeaderField("payment_amount", "0");
      return;
    }
    setHeaderField("payment_amount", value);
  }

  function selectSupplier(supplier: SupplierHit) {
    setHeader((old) => ({ ...old, supplier_id: supplier.id, supplier_text: supplier.name, supplier_due: supplier.due }));
  }

  // the supplier search needs a store
  function canSearchSupplier() {
    if (!header.store_id) {
      toast.warn("Please Select Store");
      return false;
    }
    return true;
  }

  // the product search needs a store and a location (the stock is shown for them)
  function canSearchProduct() {
    if (!header.store_id) {
      toast.warn("Please Select Store");
      return false;
    }
    if (!entry.location_id) {
      toast.warn("Please Select Location!");
      return false;
    }
    return true;
  }

  // Part number picked: fill name, unit and the last prices; qty and weight price start empty
  function selectProduct(product: ProductHit) {
    let unitPrice = "";
    if (product.purchase_price) {
      unitPrice = String(product.purchase_price);
    }

    let sellPrice = "";
    if (product.sell_price) {
      sellPrice = String(product.sell_price);
    }

    setEntry((old) => ({
      ...old,
      product: product,
      part_text: product.part_number,
      unit_price: unitPrice,
      sell_price: sellPrice,
      weight_unit: String(product.weight ?? 0),
      qty: "",
      per_kg: "",
    }));
  }

  // Typing a new part number drops the product picked before
  function changePartText(text: string) {
    setEntryField("part_text", text);
    if (entry.product) {
      setEntryField("product", null);
    }
  }

  // message of the first empty field of the "Add" row, "" when all is filled (same order as parts_bazar AddNew())
  function addItemError(): string {
    if (!entry.location_id) return "Please Select Location!";
    if (!header.purchase_type) return "Please Select Local /Import!";
    if (!header.cash_due) return "Please Select Cash/Due!";
    if (!header.purchase_date) return "Please Select Purchase Date!";
    if (!header.supplier_id) return "Please Select Supplier!";
    if (!header.store_id) return "Please select Store!";
    if (!entry.product) return "Please select a product!";
    if (entry.qty === "" || inputNumber(entry.qty) <= 0) return "Please enter order qty!";
    if (entry.weight_unit === "") return "Please enter Weight Unit !";
    if (entry.unit_price === "") return "Please enter purchase price!";
    return "";
  }

  // "Add" button: put the typed row in the grid
  function addItem() {
    const message = addItemError();
    if (message) {
      setError(message);
      return false;
    }

    const product = entry.product as ProductHit;

    // one product only once in the grid
    for (const item of items) {
      if (item.product_id === product.id) {
        toast.error("This item is already added in the grid! Please try another one or change the store.");
        return false;
      }
    }

    let locationName = "";
    for (const location of locations) {
      if (location.value === entry.location_id) {
        locationName = location.label;
      }
    }

    const qty = Math.floor(inputNumber(entry.qty));
    const unitPrice = inputNumber(entry.unit_price);
    const perKg = inputNumber(entry.per_kg);
    const weightUnit = inputNumber(entry.weight_unit);
    const totals = calcLine(qty, unitPrice, perKg, weightUnit);

    const newItem: PurchaseItem = {
      product_id: product.id,
      part_number: product.part_number,
      product_name: product.name,
      unit: product.unit,
      location_id: Number(entry.location_id),
      location_name: locationName,
      qty: qty,
      unit_price: unitPrice,
      per_kg: perKg,
      sell_price: inputNumber(entry.sell_price),
      weight_unit: weightUnit,
      total_unit_price: totals.total_unit_price,
      total_product_price: totals.total_product_price,
      total_weight: totals.total_weight,
      total_weight_amount: totals.total_weight_amount,
      total_purchase_price: totals.total_purchase_price,
    };
    setItems([...items, newItem]);
    setError("");

    // keep the location for the next product, and go back to the part number box
    setEntry(emptyEntry(entry.location_id));
    setTimeout(() => {
      if (partNumberRef.current) {
        partNumberRef.current.focus();
      }
    }, 0);
    return true;
  }

  function removeItem(index: number) {
    const newItems = [];
    for (let i = 0; i < items.length; i++) {
      if (i !== index) {
        newItems.push(items[i]);
      }
    }
    setItems(newItems);
  }

  function resetForm() {
    setHeader(emptyHeader());
    setEntry(emptyEntry());
    setItems([]);
    setLocations([]);
    setError("");
  }

  // "Create PO" / "Update PO": same checks as parts_bazar beforeSend
  async function savePurchase() {
    if (!header.cash_due) {
      setError("Please Select Cash/Due!");
      return;
    }
    if (!header.purchase_type) {
      setError("Please Select Local /Import!");
      return;
    }
    if (!header.purchase_date) {
      setError("Please Select Purchase Date!");
      return;
    }
    if (!header.supplier_id) {
      setError("Please Select Supplier!");
      return;
    }
    if (!header.store_id) {
      setError("Please Select Store!");
      return;
    }
    if (header.cash_due === CASH) {
      if (!header.payment_type) {
        toast.error("Please select a payment type!");
        return;
      }
      if (inputNumber(header.payment_amount) <= 0) {
        toast.error("Please add payment amount!");
        return;
      }
    }
    if (items.length === 0) {
      setError("Please Insert Item In List!");
      return;
    }

    // only the fields the API needs from each grid row
    const payloadItems: PurchasePayload["items"] = [];
    for (const item of items) {
      payloadItems.push({
        product_id: item.product_id,
        location_id: item.location_id,
        qty: item.qty,
        unit_price: item.unit_price,
        per_kg: item.per_kg,
        sell_price: item.sell_price,
        weight_unit: item.weight_unit,
      });
    }

    // a cash purchase sends its payment, a due purchase does not
    const isCash = header.cash_due === CASH;
    const payload: PurchasePayload = {
      purchase_date: header.purchase_date,
      cash_due: header.cash_due,
      purchase_type: header.purchase_type,
      store_id: Number(header.store_id),
      ship_by: header.ship_by || undefined,
      supplier_id: Number(header.supplier_id),
      payment_type: isCash ? header.payment_type : undefined,
      payment_amount: isCash ? inputNumber(header.payment_amount) : null,
      supplier_bill_no: header.supplier_bill_no || undefined,
      items: payloadItems,
    };

    setSaving(true);
    setError("");
    try {
      let saved;
      if (editId) {
        saved = await purchaseService.updatePurchase(editId, payload);
        toast.success("Purchase updated successfully.");
      } else {
        saved = await purchaseService.createPurchase(payload);
        toast.success("Data saved successfully.");
        resetForm();
      }
      setSavedId(saved.id);
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved. Please solve the above errors!"));
    } finally {
      setSaving(false);
    }
  }

  return {
    options, stores, locations, header, entry, items, error, saving, savedId, grandTotal, entryTotals, partNumberRef,
    setHeaderField, setEntryField, changeStore, changeCashDue, changePurchaseType, changePaymentAmount, changePartText,
    selectSupplier, selectProduct, canSearchSupplier, canSearchProduct, addItem, removeItem, savePurchase, setSavedId,
  };
};
