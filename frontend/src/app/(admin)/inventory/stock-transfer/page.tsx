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
import { stockTransferService, TransferBarcodeHit, TransferItem } from "@/services/stockTransferService";
import { StockTransferViewModal } from "../components/StockTransferView";

type Option = { value: string; label: string };

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const readOnlyClass =
  "h-9 w-full truncate rounded-md border border-gray-200 bg-gray-100 px-2.5 text-sm leading-9 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

const today = () => new Date().toISOString().slice(0, 10);

// Section box like the parts_bazar fieldsets
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">{title}</h3>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface Entry {
  hit: TransferBarcodeHit | null;
  barcode_text: string;
  to_store_id: string;
  to_location_id: string;
  transfer_qty: string;
}

const emptyEntry = (): Entry => ({ hit: null, barcode_text: "", to_store_id: "", to_location_id: "", transfer_qty: "" });

const toOptions = (rows: any[]): Option[] => rows.map((r) => ({ value: String(r.id), label: r.name }));

function StockTransferForm() {
  const router = useRouter();
  const editId = Number(useSearchParams().get("id")) || null;
  const [companies, setCompanies] = useState<Option[]>([]);
  const [stores, setStores] = useState<(Option & { company_id: number | null })[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [transferDate, setTransferDate] = useState(today());
  const [companyId, setCompanyId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [entry, setEntry] = useState<Entry>(emptyEntry);
  const [items, setItems] = useState<TransferItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // stable function, so the date picker is not rebuilt on every render
  const changeDate = useCallback((_dates: Date[], dateStr: string) => setTransferDate(dateStr), []);

  useEffect(() => {
    document.title = `${editId ? "Edit Stock Transfer" : "Stock Transfer Entry"} | Multibrand POS`;
    api.get("/configure/companies", { params: { status: 1 } })
      .then((res) => {
        const list = toOptions(res.data.data.data);
        setCompanies(list);
        // one company only: pick it, like the user's own company in parts_bazar
        if (!editId && list.length === 1) setCompanyId(list[0].value);
      })
      .catch(() => toast.error("Failed to load companies"));
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name, company_id: s.company_id }))))
      .catch(() => toast.error("Failed to load stores"));
  }, [editId]);

  // Edit: fill the form from the pending transfer
  useEffect(() => {
    if (!editId) return;
    stockTransferService.getTransfer(editId).then((t) => {
      if (t.status !== 0) {
        toast.error("Already Approved can not update!");
        router.replace("/inventory/stock-transfer-manage");
        return;
      }
      setTransferDate(String(t.transfer_date).slice(0, 10));
      setCompanyId(String(t.company_id ?? ""));
      setRemarks(t.remarks ?? "");
      setItems(t.details.map((d: any) => ({
        barcode: d.barcode,
        product_name: d.product?.name ?? "",
        part_number: d.product?.part_number ?? "",
        from_store_name: d.from_store?.name ?? "",
        from_location_name: d.from_location?.name ?? "",
        stock_qty: Number(d.stock_qty),
        to_store_id: d.to_store_id,
        to_store_name: d.to_store?.name ?? "",
        to_location_id: d.to_location_id,
        to_location_name: d.to_location?.name ?? "",
        transfer_qty: Number(d.transfer_qty),
      })));
    }).catch(() => toast.error("Failed to load stock transfer"));
  }, [editId, router]);

  const companyStores = stores.filter((s) => !companyId || !s.company_id || String(s.company_id) === companyId);

  const changeToStore = (storeId: string) => {
    setEntry((e) => ({ ...e, to_store_id: storeId, to_location_id: "" }));
    setLocations([]);
    if (!storeId) return;
    api.get("/configure/locations", { params: { store_id: storeId, status: 1 } })
      .then((res) => setLocations(toOptions(res.data.data.data)))
      .catch(() => toast.error("Failed to load locations"));
  };

  const canSearchBarcode = () => {
    if (!companyId) {
      toast.warn("Please Select Company First!");
      return false;
    }
    return true;
  };

  const selectBarcode = (hit: TransferBarcodeHit) => setEntry((e) => ({ ...e, hit, barcode_text: hit.barcode }));

  // parts_bazar qtyValidation: not more than the stock
  const changeQty = (value: string) => {
    if (entry.hit && Number(value) > entry.hit.stock) {
      toast.error("Transfer Quantity cannot be greater than Stock Quantity");
      setEntry((e) => ({ ...e, transfer_qty: "" }));
      return;
    }
    setEntry((e) => ({ ...e, transfer_qty: value }));
  };

  // "Add" button: same checks and order as parts_bazar add()
  const addItem = () => {
    const hit = entry.hit;
    if (!transferDate) return setError("Please Select Transfer date");
    if (!hit) return setError("Please Enter Barcode");
    if (items.some((item) => item.barcode === hit.barcode)) {
      toast.error("Sorry! This Barcode is already added.");
      return;
    }
    if (String(hit.store_id) === entry.to_store_id && String(hit.location_id ?? "") === entry.to_location_id) {
      return setError("Location Should Be Different");
    }
    if (!entry.to_store_id) return setError("Please Select Transfer To Store");
    if (!entry.to_location_id) return setError("Please Select To Location");
    if (!(Number(entry.transfer_qty) > 0)) return setError("Please Enter Transfer Qty");

    setItems((list) => [
      ...list,
      {
        barcode: hit.barcode,
        product_name: hit.product_name,
        part_number: hit.part_number,
        from_store_name: hit.store_name,
        from_location_name: hit.location_name ?? "",
        stock_qty: hit.stock,
        to_store_id: Number(entry.to_store_id),
        to_store_name: stores.find((s) => s.value === entry.to_store_id)?.label ?? "",
        to_location_id: Number(entry.to_location_id),
        to_location_name: locations.find((l) => l.value === entry.to_location_id)?.label ?? "",
        transfer_qty: Number(entry.transfer_qty),
      },
    ]);
    setError("");
    // clear the whole row for the next barcode, like parts_bazar
    setEntry(emptyEntry());
    setLocations([]);
    setTimeout(() => barcodeRef.current?.focus(), 0);
  };

  const save = async () => {
    if (!transferDate) return setError("Please Select Transfer Date");
    if (!companyId) return setError("Please Select Company First!");
    if (items.length === 0) return setError("Sorry! No Data in Grid.");

    const payload = {
      transfer_date: transferDate,
      company_id: Number(companyId),
      remarks: remarks || undefined,
      items: items.map(({ barcode, to_store_id, to_location_id, transfer_qty }) => ({ barcode, to_store_id, to_location_id, transfer_qty })),
    };
    try {
      setSaving(true);
      setError("");
      const saved = editId ? await stockTransferService.updateTransfer(editId, payload) : await stockTransferService.createTransfer(payload);
      toast.success(editId ? "Stock Transfer Updated Successfully." : "Stock Transfer Saved Successfully.");
      if (!editId) {
        setItems([]);
        setEntry(emptyEntry());
        setRemarks("");
      }
      setSavedId(saved.id);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstError = errors && Object.values(errors)[0];
      setError((Array.isArray(firstError) ? firstError[0] : null) || err?.response?.data?.message || "Data not saved. Please solve the above errors!");
    } finally {
      setSaving(false);
    }
  };

  const closeView = () => {
    setSavedId(null);
    if (editId) router.push("/inventory/stock-transfer-manage");
  };

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
              <ReactSelect options={companies} placeholder="Select" value={companyId} isDisabled={items.length > 0} onChange={(v) => setCompanyId(String(v ?? ""))} />
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
                  {[
                    ["Transfer From Store", "w-[120px]"], ["Location", "w-[95px]"], ["Product Name", ""], ["Part Number", "w-[95px]"],
                    ["Barcode *", "w-[140px]"], ["Stock Qty", "w-[65px]"], ["Transfer To Store *", "w-[150px]"], ["Location *", "w-[130px]"],
                    ["Transfer Qty *", "w-[75px]"], ["", "w-[70px]"],
                  ].map(([h, width], i) => (
                    <th key={i} className={`px-1 pb-1.5 font-medium ${width}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="w-[120px] px-1"><div className={readOnlyClass} title={entry.hit?.store_name ?? ""}>{entry.hit?.store_name ?? ""}</div></td>
                  <td className="w-[95px] px-1"><div className={readOnlyClass} title={entry.hit?.location_name ?? ""}>{entry.hit?.location_name ?? ""}</div></td>
                  <td className="px-1"><div className={readOnlyClass} title={entry.hit?.product_name ?? ""}>{entry.hit?.product_name ?? ""}</div></td>
                  <td className="w-[95px] px-1"><div className={readOnlyClass} title={entry.hit?.part_number ?? ""}>{entry.hit?.part_number ?? ""}</div></td>
                  <td className="w-[140px] px-1">
                    <Autocomplete
                      inputRef={barcodeRef}
                      value={entry.barcode_text}
                      onChange={(text) => setEntry((e) => ({ ...e, barcode_text: text, hit: null, transfer_qty: "" }))}
                      canSearch={canSearchBarcode}
                      search={(term) => stockTransferService.searchBarcodes(term, Number(companyId), editId)}
                      onSelect={selectBarcode}
                      placeholder="Barcode"
                      renderItem={(b) => (
                        <div>
                          <div className="font-mono font-medium">{b.barcode}</div>
                          <div className="text-xs text-gray-500">{b.product_name} · {b.store_name} / {b.location_name} · Stock {b.stock}</div>
                        </div>
                      )}
                    />
                  </td>
                  <td className="w-[65px] px-1"><div className={`${readOnlyClass} text-right`}>{entry.hit ? entry.hit.stock : ""}</div></td>
                  <td className="w-[150px] px-1">
                    <ReactSelect options={companyStores} placeholder="Select" value={entry.to_store_id} onChange={(v) => changeToStore(String(v ?? ""))} />
                  </td>
                  <td className="w-[130px] px-1">
                    <ReactSelect options={locations} placeholder="Select" value={entry.to_location_id} onChange={(v) => setEntry((e) => ({ ...e, to_location_id: String(v ?? "") }))} />
                  </td>
                  <td className="w-[75px] px-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={entry.transfer_qty}
                      placeholder="Qty"
                      onChange={(e) => changeQty(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
                  {["SL", "Transfer From", "Location", "Product Name", "Part Number", "Barcode", "Stock Qty", "Transfer To", "Location", "Transfer Qty", "Action"].map((h, i) => (
                    <th key={i} className={`px-2 py-2 font-medium ${i === 6 || i === 9 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {items.length === 0 ? (
                  <tr><td colSpan={11} className="py-6 text-center text-gray-400">No item added yet</td></tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={item.barcode} className="text-gray-700 dark:text-gray-300">
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5">{item.from_store_name}</td>
                      <td className="px-2 py-1.5">{item.from_location_name}</td>
                      <td className="px-2 py-1.5">{item.product_name}</td>
                      <td className="px-2 py-1.5">{item.part_number}</td>
                      <td className="px-2 py-1.5 font-mono text-xs font-medium">{item.barcode}</td>
                      <td className="px-2 py-1.5 text-right">{item.stock_qty}</td>
                      <td className="px-2 py-1.5">{item.to_store_name}</td>
                      <td className="px-2 py-1.5">{item.to_location_name}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{item.transfer_qty}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" title="Remove" onClick={() => setItems((list) => list.filter((_, x) => x !== i))} className="rounded p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10">
                          <FiTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : editId ? "Update" : "Save"}
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
