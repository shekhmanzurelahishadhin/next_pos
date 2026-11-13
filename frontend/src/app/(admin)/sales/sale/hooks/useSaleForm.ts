// hooks/useSaleForm.ts
// Sales form, same rules as parts_bazar "SALES FORM":
// fill order and customer, pick a barcode, "Add" it to the grid, then "Create SO".
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { apiErrorMessage, inputNumber, loadOptions, Option, today } from "@/lib/options";
import { BarcodeHit, CustomerHit, saleService, SaleFormOptions, SaleItem, SalePayload } from "@/services/saleService";

const CASH = "1"; // cash_due lookup code for "Cash"
const DUE = "2"; // cash_due lookup code for "Due"

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

function emptyHeader(companyId: string): SaleHeader {
  return {
    order_date: today(),
    cash_due: "",
    memo_no: "",
    due_limit_exceed_accept: "1",
    company_id: companyId,
    customer_id: null,
    customer_text: "",
    customer_due: null,
    mobile_no: "",
    car_name: "",
    car_no: "",
    due_limit: null,
    received_type: CASH, // parts_bazar keeps it fixed on Cash
    received_amount: "",
  };
}

function emptyEntry(): EntryRow {
  return { barcode_text: "", item: null, qty: "", sell_price: "" };
}

// qty x price of one grid row, rounded to 2 decimals
export function lineAmount(item: { qty: number; sell_price: number }) {
  return Number((item.qty * item.sell_price).toFixed(2));
}

export const useSaleForm = (editId: number | null) => {
  const { confirm } = useAlert();
  const [options, setOptions] = useState<SaleFormOptions | null>(null);
  const [companies, setCompanies] = useState<Option[]>([]);
  const [header, setHeader] = useState<SaleHeader>(emptyHeader(""));
  const [entry, setEntry] = useState<EntryRow>(emptyEntry());
  const [items, setItems] = useState<SaleItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null); // opens the invoice after saving
  const barcodeRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // grand total of the grid
  let grandTotal = 0;
  for (const item of items) {
    grandTotal += lineAmount(item);
  }
  grandTotal = Number(grandTotal.toFixed(2));

  // dropdown lists of the form
  useEffect(() => {
    saleService.getFormOptions()
      .then(setOptions)
      .catch(() => toast.error("Failed to load sales form"));

    loadOptions("/configure/companies")
      .then((list) => {
        setCompanies(list);
        // one company: pick it, like parts_bazar does for a user of one company
        if (list.length === 1 && !editId) {
          setHeader((old) => ({ ...old, company_id: list[0].value }));
        }
      })
      .catch(() => toast.error("Failed to load companies"));
  }, [editId]);

  // Edit: fill the form from a saved (pending) SO
  useEffect(() => {
    if (!editId) {
      return;
    }
    fillFromSale(editId).catch(() => toast.error("Failed to load sale"));
  }, [editId]);

  async function fillFromSale(saleId: number) {
    const sale = await saleService.getSale(saleId);

    let receivedAmount = "";
    if (Number(sale.received_amount) > 0) {
      receivedAmount = String(Number(sale.received_amount));
    }

    setHeader({
      order_date: String(sale.order_date).slice(0, 10),
      cash_due: String(sale.cash_due ?? ""),
      memo_no: sale.memo_no ?? "",
      due_limit_exceed_accept: String(sale.due_limit_exceed_accept ?? "1"),
      company_id: String(sale.company_id),
      customer_id: sale.customer_id,
      customer_text: sale.customer ? sale.customer.name : "",
      customer_due: sale.customer_due,
      mobile_no: sale.mobile_no ?? "",
      car_name: sale.car_name ?? "",
      car_no: sale.car_no ?? "",
      due_limit: Number(sale.customer ? sale.customer.credit_limit : 0),
      received_type: String(sale.received_type ?? CASH),
      received_amount: receivedAmount,
    });

    const savedItems: SaleItem[] = [];
    for (const detail of sale.details) {
      // the stock left for the barcode, not counting this SO itself
      let stock = Number(detail.qty);
      const hits = await saleService.searchBarcodes(detail.barcode, sale.company_id, saleId);
      for (const hit of hits) {
        if (hit.barcode === detail.barcode) {
          stock = hit.stock;
        }
      }

      savedItems.push({
        barcode: detail.barcode,
        product_id: detail.product_id,
        product_name: detail.product ? detail.product.name : "",
        part_number: detail.product ? detail.product.part_number : "",
        unit: detail.unit,
        store_id: detail.store_id,
        store_name: detail.store ? detail.store.name : "",
        location_id: detail.location_id,
        location_name: detail.location ? detail.location.name : "",
        purchase_price: Number(detail.purchase_price),
        stock: stock,
        qty: Number(detail.qty),
        sell_price: Number(detail.sell_price),
      });
    }
    setItems(savedItems);
  }

  function setHeaderField(field: keyof SaleHeader, value: string | number | null) {
    setHeader((old) => ({ ...old, [field]: value }));
  }

  function setEntryField(field: keyof EntryRow, value: string) {
    setEntry((old) => ({ ...old, [field]: value }));
  }

  // the date picker needs a function that does not change on every render
  const changeDate = useCallback((_dates: Date[], dateStr: string) => {
    setHeader((old) => ({ ...old, order_date: dateStr }));
  }, []);

  // A due sale has no money received
  function changeCashDue(value: string) {
    setHeader((old) => ({ ...old, cash_due: value, received_amount: "" }));
  }

  // Typing a new customer name drops the customer picked before
  function changeCustomerText(text: string) {
    setHeader((old) => ({ ...old, customer_text: text, customer_id: null }));
  }

  function selectCustomer(customer: CustomerHit) {
    let customerText = customer.name;
    if (customer.phone) {
      customerText = `${customer.name}(${customer.phone})`;
    }

    setHeader((old) => ({
      ...old,
      customer_id: customer.id,
      customer_text: customerText,
      customer_due: customer.due,
      mobile_no: customer.phone ?? "",
      car_name: customer.car_name ?? old.car_name,
      due_limit: customer.due_limit,
    }));
  }

  // the customer search needs a company
  function canSearchCustomer() {
    if (!header.company_id) {
      toast.warn("Please Select Company");
      return false;
    }
    return true;
  }

  // the barcode search needs a company
  function canSearchBarcode() {
    if (!header.company_id) {
      toast.warn("Please Select Company First!");
      return false;
    }
    return true;
  }

  // Typing a new barcode drops the barcode picked before
  function changeBarcodeText(text: string) {
    setEntry((old) => ({ ...old, barcode_text: text, item: null }));
  }

  // Barcode picked: store, location, product, stock and purchase price come from it
  function selectBarcode(item: BarcodeHit) {
    setEntry((old) => ({ ...old, item: item, barcode_text: item.barcode, qty: "" }));
    setTimeout(() => {
      if (qtyRef.current) {
        qtyRef.current.focus();
      }
    }, 0);
  }

  // the qty of the "Add" row can not pass the stock
  function changeEntryQty(value: string) {
    if (entry.item && inputNumber(value) > entry.item.stock) {
      toast.error("Quantity can not be grater than available stock");
      setEntryField("qty", "");
      return;
    }
    setEntryField("qty", value);
  }

  function resetEntry() {
    setEntry(emptyEntry());
  }

  // message of the first problem of the "Add" row, "" when all is fine (same order as parts_bazar AddNew())
  function addItemError(): string {
    if (!header.order_date) return "Please Select Order Date!";
    if (!header.cash_due) return "Please Select Cash / Due!";
    if (!header.customer_id) return "Please Select Customer!";
    if (!entry.item) return "Please Enter Code!";
    if (!header.company_id) return "Please Select Company!";
    if (entry.qty === "" || inputNumber(entry.qty) <= 0) return "Please Insert Qty!";
    if (entry.sell_price === "") return "Please Insert Sell Price";
    if (entry.item.stock <= 0) return "Stock is not available";

    // one barcode only once in the grid
    for (const item of items) {
      if (item.barcode === entry.item.barcode) {
        return "This barcode is already added in the grid!.";
      }
    }
    return "";
  }

  // "Add" button: put the typed row in the grid
  function addItem() {
    const message = addItemError();
    if (message) {
      toast.error(message);
      return false;
    }

    const newItem: SaleItem = {
      ...(entry.item as BarcodeHit),
      qty: inputNumber(entry.qty),
      sell_price: inputNumber(entry.sell_price),
    };
    setItems([...items, newItem]);
    setError("");

    // go back to the barcode box for the next item
    setEntry(emptyEntry());
    setTimeout(() => {
      if (barcodeRef.current) {
        barcodeRef.current.focus();
      }
    }, 0);
    return true;
  }

  // qty / price typed in the grid; a qty above the stock (or 0) goes back to 1
  function changeItem(index: number, field: "qty" | "sell_price", value: string) {
    const newItems: SaleItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (i !== index) {
        newItems.push(item);
        continue;
      }

      const number = inputNumber(value);
      if (field === "qty" && (number > item.stock || number <= 0)) {
        if (number > item.stock) {
          toast.error("Quantity is less than stock");
        }
        newItems.push({ ...item, qty: 1 });
      } else {
        newItems.push({ ...item, [field]: number });
      }
    }
    setItems(newItems);
  }

  function removeItem(index: number) {
    const newItems: SaleItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (i !== index) {
        newItems.push(items[i]);
      }
    }
    setItems(newItems);
  }

  function resetForm() {
    // one company stays picked
    let companyId = "";
    if (companies.length === 1) {
      companyId = companies[0].value;
    }
    setHeader(emptyHeader(companyId));
    setEntry(emptyEntry());
    setItems([]);
    setError("");
  }

  // "Cancel" button of parts_bazar: clear everything after asking
  async function cancelForm() {
    const result = await confirm({ title: "Cancel?", text: "Are you sure to cancel?" });
    if (result.isConfirmed) {
      resetForm();
    }
  }

  // "Create SO" / "Update SO": same checks as parts_bazar beforeSend
  async function saveSale() {
    if (!header.order_date) {
      toast.error("Please Select Order Date!");
      return;
    }
    if (!header.cash_due) {
      toast.error("Please Select Cash / Due!");
      return;
    }
    if (!header.customer_id) {
      toast.error("Please Select Customer!");
      return;
    }
    if (header.cash_due === CASH) {
      if (!header.received_type) {
        toast.error("Please select a received type!");
        return;
      }
      if (inputNumber(header.received_amount) <= 0) {
        toast.error("Please add received amount!");
        return;
      }
    }
    if (header.cash_due === DUE && header.due_limit_exceed_accept === "2" && (header.due_limit ?? 0) < grandTotal) {
      setError("Sorry! Due Limit Exceed!");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one Item!");
      return;
    }

    // only the fields the API needs from each grid row
    const payloadItems: SalePayload["items"] = [];
    for (const item of items) {
      payloadItems.push({ barcode: item.barcode, qty: item.qty, sell_price: item.sell_price });
    }

    // a cash sale sends the money received, a due sale does not
    const isCash = header.cash_due === CASH;
    const payload: SalePayload = {
      company_id: Number(header.company_id),
      order_date: header.order_date,
      cash_due: header.cash_due,
      memo_no: header.memo_no || undefined,
      customer_id: Number(header.customer_id),
      mobile_no: header.mobile_no || undefined,
      car_name: header.car_name || undefined,
      car_no: header.car_no || undefined,
      due_limit_exceed_accept: header.due_limit_exceed_accept,
      received_type: isCash ? header.received_type : undefined,
      received_amount: isCash ? inputNumber(header.received_amount) : null,
      items: payloadItems,
    };

    setSaving(true);
    setError("");
    try {
      let saved;
      if (editId) {
        saved = await saleService.updateSale(editId, payload);
        toast.success("Sale updated successfully.");
      } else {
        saved = await saleService.createSale(payload);
        toast.success("Data saved successfully.");
        resetForm();
      }
      setSavedId(saved.id);
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved. Pleae solve the above errors."));
    } finally {
      setSaving(false);
    }
  }

  return {
    options, companies, header, entry, items, error, saving, savedId, grandTotal, barcodeRef, qtyRef,
    setHeaderField, setEntryField, setSavedId, changeCashDue, changeDate, changeCustomerText, selectCustomer,
    canSearchCustomer, canSearchBarcode, changeBarcodeText, selectBarcode, changeEntryQty, resetEntry,
    addItem, changeItem, removeItem, cancelForm, saveSale,
  };
};
