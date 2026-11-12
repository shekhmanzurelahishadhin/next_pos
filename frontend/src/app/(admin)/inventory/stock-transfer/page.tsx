"use client";
// Stock Transfer Entry, like parts_bazar stockTransfer/create:
// pick a barcode (its store / location fill in), choose where it goes and the qty, "Add", then "Save"
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import DatePicker from "@/components/form/date-picker";
import Autocomplete from "@/components/form/Autocomplete";
import Button from "@/components/ui/button/Button";
import { FiPlus, FiTrash } from "@/icons/index";
import { api } from "@/lib/api";
import { apiErrorMessage, blurOnWheel, loadOptions, Option, optionLabel, today } from "@/lib/options";
import { stockTransferService, TransferBarcodeHit, TransferItem } from "@/services/stockTransferService";
import { StockTransferViewModal } from "../components/StockTransferView";

type StoreOption = Option & { company_id: number | null };

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const readOnlyClass =
  "h-9 w-full truncate rounded-md border border-gray-200 bg-gray-100 px-2.5 text-sm leading-9 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
const headCell = "px-1 pb-1.5 font-medium";
const gridHeadCell = "px-2 py-2 font-medium";
const gridCell = "px-2 py-1.5";

// Section box like the parts_bazar fieldsets
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">{title}</h3>
      <div className="p-4">{children}</div>
    </div>
  );
}

// the "Product Information" row above the grid
interface Entry {
  hit: TransferBarcodeHit | null;
  barcode_text: string;
  to_store_id: string;
  to_location_id: string;
  transfer_qty: string;
}

function emptyEntry(): Entry {
  return { hit: null, barcode_text: "", to_store_id: "", to_location_id: "", transfer_qty: "" };
}

function StockTransferForm() {
  const router = useRouter();

  // ?id=12 opens transfer 12 to edit
  const idInUrl = Number(useSearchParams().get("id"));
  const editId = idInUrl > 0 ? idInUrl : null;

  const [companies, setCompanies] = useState<Option[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [transferDate, setTransferDate] = useState(today());
  const [companyId, setCompanyId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [entry, setEntry] = useState<Entry>(emptyEntry());
  const [items, setItems] = useState<TransferItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // the date picker needs a function that does not change on every render
  const changeDate = useCallback((_dates: Date[], dateStr: string) => setTransferDate(dateStr), []);

  useEffect(() => {
    document.title = `${editId ? "Edit Stock Transfer" : "Stock Transfer Entry"} | Multibrand POS`;

    loadOptions("/configure/companies")
      .then((list) => {
        setCompanies(list);
        // only one company: pick it, like the user's own company in parts_bazar
        if (!editId && list.length === 1) {
          setCompanyId(list[0].value);
        }
      })
      .catch(() => toast.error("Failed to load companies"));

    loadStores().catch(() => toast.error("Failed to load stores"));
  }, [editId]);

  async function loadStores() {
    const res = await api.get("/configure/stores", { params: { status: 1 } });
    const list: StoreOption[] = [];
    for (const store of res.data.data.data) {
      list.push({ value: String(store.id), label: store.name, company_id: store.company_id });
    }
    setStores(list);
  }

  // Edit: fill the form from the pending transfer
  useEffect(() => {
    if (!editId) {
      return;
    }
    fillFromTransfer(editId).catch(() => toast.error("Failed to load stock transfer"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function fillFromTransfer(transferId: number) {
    const transfer = await stockTransferService.getTransfer(transferId);

    // an approved transfer is locked
    if (transfer.status !== 0) {
      toast.error("Already Approved can not update!");
      router.replace("/inventory/stock-transfer-manage");
      return;
    }

    setTransferDate(String(transfer.transfer_date).slice(0, 10));
    setCompanyId(String(transfer.company_id ?? ""));
    setRemarks(transfer.remarks ?? "");

    const savedItems: TransferItem[] = [];
    for (const detail of transfer.details) {
      savedItems.push({
        barcode: detail.barcode,
        product_name: detail.product ? detail.product.name : "",
        part_number: detail.product ? detail.product.part_number : "",
        from_store_name: detail.from_store ? detail.from_store.name : "",
        from_location_name: detail.from_location ? detail.from_location.name : "",
        stock_qty: Number(detail.stock_qty),
        to_store_id: detail.to_store_id,
        to_store_name: detail.to_store ? detail.to_store.name : "",
        to_location_id: detail.to_location_id,
        to_location_name: detail.to_location ? detail.to_location.name : "",
        transfer_qty: Number(detail.transfer_qty),
      });
    }
    setItems(savedItems);
  }

  // stores of the picked company (a store with no company belongs to every company)
  const companyStores: StoreOption[] = [];
  for (const store of stores) {
    if (!companyId || !store.company_id || String(store.company_id) === companyId) {
      companyStores.push(store);
    }
  }

  // a new "to store": load its locations
  function changeToStore(storeId: string) {
    setEntry((old) => ({ ...old, to_store_id: storeId, to_location_id: "" }));
    setLocations([]);
    if (!storeId) {
      return;
    }
    loadOptions("/configure/locations", { store_id: storeId })
      .then(setLocations)
      .catch(() => toast.error("Failed to load locations"));
  }

  // the barcode search needs a company
  function canSearchBarcode() {
    if (!companyId) {
      toast.warn("Please Select Company First!");
      return false;
    }
    return true;
  }

  function selectBarcode(hit: TransferBarcodeHit) {
    setEntry((old) => ({ ...old, hit: hit, barcode_text: hit.barcode }));
  }

  // typing a new barcode drops the barcode picked before
  function changeBarcodeText(text: string) {
    setEntry((old) => ({ ...old, barcode_text: text, hit: null, transfer_qty: "" }));
  }

  // parts_bazar qtyValidation: not more than the stock
  function changeQty(value: string) {
    if (entry.hit && Number(value) > entry.hit.stock) {
      toast.error("Transfer Quantity cannot be greater than Stock Quantity");
      setEntry((old) => ({ ...old, transfer_qty: "" }));
      return;
    }
    setEntry((old) => ({ ...old, transfer_qty: value }));
  }

  // Enter in the qty box works like the Add button
  function addOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  // "Add" button: same checks and order as parts_bazar add()
  function addItem() {
    const hit = entry.hit;
    if (!transferDate) {
      setError("Please Select Transfer date");
      return;
    }
    if (!hit) {
      setError("Please Enter Barcode");
      return;
    }
    for (const item of items) {
      if (item.barcode === hit.barcode) {
        toast.error("Sorry! This Barcode is already added.");
        return;
      }
    }
    if (String(hit.store_id) === entry.to_store_id && String(hit.location_id ?? "") === entry.to_location_id) {
      setError("Location Should Be Different");
      return;
    }
    if (!entry.to_store_id) {
      setError("Please Select Transfer To Store");
      return;
    }
    if (!entry.to_location_id) {
      setError("Please Select To Location");
      return;
    }
    if (Number(entry.transfer_qty) <= 0 || isNaN(Number(entry.transfer_qty))) {
      setError("Please Enter Transfer Qty");
      return;
    }

    const newItem: TransferItem = {
      barcode: hit.barcode,
      product_name: hit.product_name,
      part_number: hit.part_number,
      from_store_name: hit.store_name,
      from_location_name: hit.location_name ?? "",
      stock_qty: hit.stock,
      to_store_id: Number(entry.to_store_id),
      to_store_name: optionLabel(stores, entry.to_store_id),
      to_location_id: Number(entry.to_location_id),
      to_location_name: optionLabel(locations, entry.to_location_id),
      transfer_qty: Number(entry.transfer_qty),
    };
    setItems([...items, newItem]);
    setError("");

    // clear the whole row for the next barcode, like parts_bazar
    setEntry(emptyEntry());
    setLocations([]);
    setTimeout(() => {
      if (barcodeRef.current) {
        barcodeRef.current.focus();
      }
    }, 0);
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

  async function save() {
    if (!transferDate) {
      setError("Please Select Transfer Date");
      return;
    }
    if (!companyId) {
      setError("Please Select Company First!");
      return;
    }
    if (items.length === 0) {
      setError("Sorry! No Data in Grid.");
      return;
    }

    // only the fields the API needs from each grid row
    const payloadItems = [];
    for (const item of items) {
      payloadItems.push({
        barcode: item.barcode,
        to_store_id: item.to_store_id,
        to_location_id: item.to_location_id,
        transfer_qty: item.transfer_qty,
      });
    }
    const payload = {
      transfer_date: transferDate,
      company_id: Number(companyId),
      remarks: remarks || undefined,
      items: payloadItems,
    };

    setSaving(true);
    setError("");
    try {
      let saved;
      if (editId) {
        saved = await stockTransferService.updateTransfer(editId, payload);
        toast.success("Stock Transfer Updated Successfully.");
      } else {
        saved = await stockTransferService.createTransfer(payload);
        toast.success("Stock Transfer Saved Successfully.");
        setItems([]);
        setEntry(emptyEntry());
        setRemarks("");
      }
      setSavedId(saved.id);
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved. Please solve the above errors!"));
    } finally {
      setSaving(false);
    }
  }

  // after editing, closing the transfer view goes back to the manage page
  function closeView() {
    setSavedId(null);
    if (editId) {
      router.push("/inventory/stock-transfer-manage");
    }
  }

  const hit = entry.hit;
  let saveLabel = editId ? "Update" : "Save";
  if (saving) {
    saveLabel = "Saving...";
  }

  return (
    <div>
      <PageBreadcrumb items={[{ title: "Inventory" }, { title: editId ? "Edit Stock Transfer" : "Stock Transfer Entry" }]} />

      <div className="space-y-4">
        <Section title="Stock Transfer">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label required>Transfer Date</Label>
              <DatePicker id="transfer_date" defaultDate={transferDate} onChange={changeDate} placeholder="Select date" />
            </div>
            <div>
              <Label required>Company</Label>
              {/* parts_bazar locks the company once items are in the grid */}
              <ReactSelect
                options={companies}
                placeholder="Select"
                value={companyId}
                isDisabled={items.length > 0}
                onChange={(value) => setCompanyId(value ? String(value) : "")}
              />
            </div>
            <div>
              <Label>Remarks</Label>
              <input type="text" value={remarks} maxLength={255} onChange={(e) => setRemarks(e.target.value)} className={inputClass} />
            </div>
          </div>
        </Section>

        {error && (
          <div className="rounded-md border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <Section title="Product Information">
          <div className="custom-scrollbar overflow-x-auto pb-1">
            {/* fixed layout, so a long store name is cut instead of pushing the other columns */}
            <table className="w-full min-w-[1060px] table-fixed text-[13px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  <th className={`${headCell} w-[120px]`}>Transfer From Store</th>
                  <th className={`${headCell} w-[95px]`}>Location</th>
                  <th className={headCell}>Product Name</th>
                  <th className={`${headCell} w-[95px]`}>Part Number</th>
                  <th className={`${headCell} w-[140px]`}>Barcode *</th>
                  <th className={`${headCell} w-[65px]`}>Stock Qty</th>
                  <th className={`${headCell} w-[150px]`}>Transfer To Store *</th>
                  <th className={`${headCell} w-[130px]`}>Location *</th>
                  <th className={`${headCell} w-[75px]`}>Transfer Qty *</th>
                  <th className={`${headCell} w-[70px]`}></th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="w-[120px] px-1"><div className={readOnlyClass} title={hit ? hit.store_name : ""}>{hit ? hit.store_name : ""}</div></td>
                  <td className="w-[95px] px-1"><div className={readOnlyClass} title={hit ? hit.location_name ?? "" : ""}>{hit ? hit.location_name : ""}</div></td>
                  <td className="px-1"><div className={readOnlyClass} title={hit ? hit.product_name : ""}>{hit ? hit.product_name : ""}</div></td>
                  <td className="w-[95px] px-1"><div className={readOnlyClass} title={hit ? hit.part_number : ""}>{hit ? hit.part_number : ""}</div></td>
                  <td className="w-[140px] px-1">
                    <Autocomplete
                      inputRef={barcodeRef}
                      value={entry.barcode_text}
                      onChange={changeBarcodeText}
                      canSearch={canSearchBarcode}
                      search={(term) => stockTransferService.searchBarcodes(term, Number(companyId), editId)}
                      onSelect={selectBarcode}
                      placeholder="Barcode"
                      renderItem={(barcode) => (
                        <div>
                          <div className="font-mono font-medium">{barcode.barcode}</div>
                          <div className="text-xs text-gray-500">
                            {barcode.product_name} · {barcode.store_name} / {barcode.location_name} · Stock {barcode.stock}
                          </div>
                        </div>
                      )}
                    />
                  </td>
                  <td className="w-[65px] px-1"><div className={`${readOnlyClass} text-right`}>{hit ? hit.stock : ""}</div></td>
                  <td className="w-[150px] px-1">
                    <ReactSelect
                      options={companyStores}
                      placeholder="Select"
                      value={entry.to_store_id}
                      onChange={(value) => changeToStore(value ? String(value) : "")}
                    />
                  </td>
                  <td className="w-[130px] px-1">
                    <ReactSelect
                      options={locations}
                      placeholder="Select"
                      value={entry.to_location_id}
                      onChange={(value) => setEntry((old) => ({ ...old, to_location_id: value ? String(value) : "" }))}
                    />
                  </td>
                  <td className="w-[75px] px-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={entry.transfer_qty}
                      placeholder="Qty"
                      onChange={(e) => changeQty(e.target.value)}
                      onKeyDown={addOnEnter}
                      onWheel={blurOnWheel}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="w-[70px] px-1">
                    <Button type="button" size="sm" onClick={addItem} className="h-9 w-full px-2">
                      <FiPlus /> Add
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={`Added List (${items.length})`}>
          <div className="custom-scrollbar max-h-[360px] overflow-auto">
            <table className="w-full min-w-[1150px] text-[13px]">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className={gridHeadCell}>SL</th>
                  <th className={gridHeadCell}>Transfer From</th>
                  <th className={gridHeadCell}>Location</th>
                  <th className={gridHeadCell}>Product Name</th>
                  <th className={gridHeadCell}>Part Number</th>
                  <th className={gridHeadCell}>Barcode</th>
                  <th className={`${gridHeadCell} text-right`}>Stock Qty</th>
                  <th className={gridHeadCell}>Transfer To</th>
                  <th className={gridHeadCell}>Location</th>
                  <th className={`${gridHeadCell} text-right`}>Transfer Qty</th>
                  <th className={gridHeadCell}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-gray-400">No item added yet</td>
                  </tr>
                )}
                {items.map((item, index) => (
                  <tr key={item.barcode} className="text-gray-700 dark:text-gray-300">
                    <td className={gridCell}>{index + 1}</td>
                    <td className={gridCell}>{item.from_store_name}</td>
                    <td className={gridCell}>{item.from_location_name}</td>
                    <td className={gridCell}>{item.product_name}</td>
                    <td className={gridCell}>{item.part_number}</td>
                    <td className={`${gridCell} font-mono text-xs font-medium`}>{item.barcode}</td>
                    <td className={`${gridCell} text-right`}>{item.stock_qty}</td>
                    <td className={gridCell}>{item.to_store_name}</td>
                    <td className={gridCell}>{item.to_location_name}</td>
                    <td className={`${gridCell} text-right font-semibold`}>{item.transfer_qty}</td>
                    <td className={gridCell}>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => removeItem(index)}
                        className="rounded p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <FiTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start">
          <Button type="button" onClick={save} disabled={saving}>
            {saveLabel}
          </Button>
        </div>
      </div>

      <StockTransferViewModal transferId={savedId} onClose={closeView} />
    </div>
  );
}

export default function StockTransferPage() {
  return (
    <AccessRoute requiredPermissions={["stock-transfer.create", "stock-transfer.edit"]}>
      <Suspense fallback={null}>
        <StockTransferForm />
      </Suspense>
    </AccessRoute>
  );
}
