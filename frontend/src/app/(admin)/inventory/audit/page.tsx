"use client";
// Inventory Audit Entry, like parts_bazar inventoryAudit/create, made easier to use:
// pick audit / store / location, scan barcodes (each scan = +1), fix a count by hand if needed,
// see the ERP qty and the difference while counting, and add the barcodes nobody found as 0.
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { FiAlertTriangle, FiCheckCircle, FiMinus, FiPlus, FiTrash } from "react-icons/fi";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import Button from "@/components/ui/button/Button";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, blurOnWheel, inputNumber, loadOptions, Option } from "@/lib/options";
import { inventoryAuditService, AuditBarcode, AuditLine, AuditName } from "@/services/inventoryAuditService";
import { InventoryAuditViewModal } from "../components/InventoryAuditView";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

// short beep so the person scanning hears whether it worked without looking
function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.08 : 0.25));
  } catch {
    // no sound support: nothing to do
  }
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone = "gray" }: { label: string; value: number; tone?: "gray" | "brand" | "error" | "warning" | "success" }) {
  const tones = {
    gray: "text-gray-800 dark:text-white/90",
    brand: "text-brand-600 dark:text-brand-400",
    error: "text-error-600 dark:text-error-400",
    warning: "text-warning-600 dark:text-orange-400",
    success: "text-success-600 dark:text-success-500",
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold ${tones[tone]}`}>{value}</div>
    </div>
  );
}

// difference shown with its sign: "+2", "-3", "0"
function diffText(diff: number) {
  if (diff > 0) {
    return `+${diff}`;
  }
  return String(diff);
}

// green = same as the ERP, red = short, orange = more than the ERP
function diffClass(diff: number) {
  if (diff === 0) {
    return "text-success-600 dark:text-success-500";
  }
  if (diff < 0) {
    return "text-error-600 dark:text-error-400";
  }
  return "text-warning-600 dark:text-orange-400";
}

function InventoryAuditForm() {
  const router = useRouter();

  // ?id=12 opens audit 12 to continue counting
  const idInUrl = Number(useSearchParams().get("id"));
  const editId = idInUrl > 0 ? idInUrl : null;

  const [auditNames, setAuditNames] = useState<AuditName[]>([]);
  const [stores, setStores] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [auditNameId, setAuditNameId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [remarks, setRemarks] = useState("");

  const [lines, setLines] = useState<AuditLine[]>([]);
  const [expected, setExpected] = useState<AuditBarcode[]>([]);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{ ok: boolean; text: string } | null>(null);
  const [flash, setFlash] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const scanQueue = useRef<Promise<void>>(Promise.resolve());
  const known = useRef(new Map<string, AuditBarcode>()); // barcodes looked up already, by lower-case code

  // counting can start when the audit name, store and location are picked
  const ready = auditNameId !== "" && storeId !== "" && locationId !== "";

  useEffect(() => {
    document.title = `${editId ? "Edit Inventory Audit" : "Inventory Audit Entry"} | Multibrand POS`;

    inventoryAuditService.activeAuditNames()
      .then((list) => {
        setAuditNames(list);
        // only one active audit: pick it, like parts_bazar
        if (!editId && list.length === 1) {
          setAuditNameId(String(list[0].id));
        }
      })
      .catch(() => toast.error("Failed to load audit names"));

    loadOptions("/configure/stores")
      .then(setStores)
      .catch(() => toast.error("Failed to load stores"));
  }, [editId]);

  function loadLocations(store: string) {
    setLocations([]);
    if (!store) {
      return;
    }
    loadOptions("/configure/locations", { store_id: store })
      .then(setLocations)
      .catch(() => toast.error("Failed to load locations"));
  }

  // What the ERP has in the location, to show what was not scanned
  useEffect(() => {
    setExpected([]);
    if (!storeId || !locationId) {
      return;
    }
    inventoryAuditService.locationStock(Number(storeId), Number(locationId))
      .then(setExpected)
      .catch(() => {});
  }, [storeId, locationId]);

  // Edit: continue counting a saved audit
  useEffect(() => {
    if (!editId) {
      return;
    }
    fillFromAudit(editId).catch(() => toast.error("Failed to load audit"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function fillFromAudit(auditId: number) {
    const audit = await inventoryAuditService.getAudit(auditId);

    setAuditNameId(String(audit.audit_name_id));
    setStoreId(String(audit.store_id));
    setLocationId(String(audit.location_id));
    setRemarks(audit.remarks ?? "");
    loadLocations(String(audit.store_id));

    const savedLines: AuditLine[] = [];
    for (const detail of audit.details) {
      const line: AuditLine = {
        barcode: detail.barcode,
        product_id: detail.product_id,
        product_name: detail.product ? detail.product.name : "",
        part_number: detail.product ? detail.product.part_number : "",
        location_id: detail.location_id,
        location_name: detail.location ? detail.location.name : "",
        erp_qty: Number(detail.erp_qty),
        physical_qty: Number(detail.physical_qty),
      };
      savedLines.push(line);
      known.current.set(line.barcode.toLowerCase(), line);
    }
    setLines(savedLines);

    // keep the audit name in the list even if it is inactive now
    setAuditNames((list) => {
      for (const name of list) {
        if (name.id === audit.audit_name_id) {
          return list;
        }
      }
      return [...list, audit.audit_name];
    });
  }

  // put the cursor in the scan box when counting can start
  useEffect(() => {
    if (ready && scanRef.current) {
      scanRef.current.focus();
    }
  }, [ready]);

  function changeStore(value: string) {
    known.current.clear(); // the barcodes looked up belong to the old store
    setStoreId(value);
    setLocationId("");
    loadLocations(value);
  }

  // colour the row of a scanned barcode for a moment
  function highlight(code: string) {
    setFlash(code);
    setTimeout(() => {
      setFlash((old) => (old === code ? "" : old));
    }, 900);
  }

  // add a barcode to the list, or +qty when it is in the list already
  function addLine(item: AuditBarcode, qty = 1) {
    known.current.set(item.barcode.toLowerCase(), item);

    setLines((list) => {
      let found = false;
      const newList: AuditLine[] = [];
      for (const line of list) {
        if (line.barcode === item.barcode) {
          found = true;
          newList.push({ ...line, physical_qty: line.physical_qty + qty });
        } else {
          newList.push(line);
        }
      }

      // a new barcode goes on top
      if (!found) {
        newList.unshift({ ...item, physical_qty: qty });
      }
      return newList;
    });

    highlight(item.barcode);
  }

  // One scan: a barcode seen before is counted at once, a new one is looked up on the server
  async function processScan(code: string) {
    const seen = known.current.get(code.toLowerCase());
    if (seen) {
      addLine(seen);
      setLastScan({ ok: true, text: `${seen.product_name} · ${seen.barcode} +1` });
      beep(true);
      return;
    }

    setScanning(true);
    try {
      const item = await inventoryAuditService.scan(code, Number(storeId));
      addLine(item);
      setLastScan({ ok: true, text: `${item.product_name} · ${item.barcode} added` });
      beep(true);
    } catch (err) {
      setLastScan({ ok: false, text: apiErrorMessage(err, "Barcode not found") });
      beep(false);
    } finally {
      setScanning(false);
    }
  }

  // The box is never blocked: a fast scanner can keep scanning, the scans are handled one by one in order
  function scan() {
    const code = barcode.trim();
    if (!code) {
      return;
    }
    if (!ready) {
      toast.warn("Select audit name, store and location first!");
      return;
    }
    setBarcode("");
    scanQueue.current = scanQueue.current.then(() => processScan(code));
  }

  // Enter in the scan box (a scanner sends Enter after the code) scans
  function scanOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      scan();
    }
  }

  // Enter in a count box goes back to the scan box
  function backToScanOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && scanRef.current) {
      scanRef.current.focus();
    }
  }

  // count typed by hand; never below 0
  function setQty(code: string, value: number) {
    setLines((list) => {
      const newList: AuditLine[] = [];
      for (const line of list) {
        if (line.barcode === code) {
          newList.push({ ...line, physical_qty: Math.max(0, value) });
        } else {
          newList.push(line);
        }
      }
      return newList;
    });
  }

  function removeLine(code: string) {
    setLines((list) => list.filter((line) => line.barcode !== code));
  }

  // barcodes the ERP has in the location that are not in the list yet
  const countedBarcodes = new Set<string>();
  for (const line of lines) {
    countedBarcodes.add(line.barcode);
  }
  const notScanned: AuditBarcode[] = [];
  for (const item of expected) {
    if (!countedBarcodes.has(item.barcode)) {
      notScanned.push(item);
    }
  }

  // the barcodes nobody found are added with 0 counted
  function addMissingAsZero(items: AuditBarcode[]) {
    const newLines: AuditLine[] = [];
    for (const item of items) {
      known.current.set(item.barcode.toLowerCase(), item);
      newLines.push({ ...item, physical_qty: 0 });
    }
    setLines((list) => [...list, ...newLines]);
  }

  // totals of the list: short = counted less than the ERP, excess = counted more
  const totals = { erp: 0, physical: 0, short: 0, excess: 0 };
  for (const line of lines) {
    const diff = line.physical_qty - line.erp_qty;
    totals.erp += line.erp_qty;
    totals.physical += line.physical_qty;
    if (diff < 0) {
      totals.short++;
    }
    if (diff > 0) {
      totals.excess++;
    }
  }

  async function save() {
    if (!ready) {
      toast.error("Select audit name, store and location first!");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one row.");
      return;
    }

    const items = [];
    for (const line of lines) {
      items.push({ barcode: line.barcode, physical_qty: line.physical_qty });
    }
    const payload = {
      audit_name_id: Number(auditNameId),
      store_id: Number(storeId),
      location_id: Number(locationId),
      remarks: remarks || undefined,
      items: items,
    };

    setSaving(true);
    try {
      let saved;
      if (editId) {
        saved = await inventoryAuditService.updateAudit(editId, payload);
        toast.success("Inventory audit updated");
      } else {
        saved = await inventoryAuditService.createAudit(payload);
        toast.success("Inventory audit saved");
        setLines([]);
        setRemarks("");
        setLastScan(null);
      }
      setSavedId(saved.id);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  // after editing, closing the audit view goes back to the manage page
  function closeView() {
    setSavedId(null);
    if (editId) {
      router.push("/inventory/audit-manage");
    }
  }

  let selectedName: AuditName | undefined;
  const auditNameOptions: Option[] = [];
  for (const name of auditNames) {
    auditNameOptions.push({ value: String(name.id), label: name.audit_name });
    if (String(name.id) === auditNameId) {
      selectedName = name;
    }
  }

  const lockPlace = lines.length > 0; // parts_bazar locks the location once counting started

  let saveLabel = editId ? "Update Audit" : "Save Audit";
  if (saving) {
    saveLabel = "Saving...";
  }

  return (
    <div>
      <PageBreadcrumb items={[{ title: "Inventory" }, { title: editId ? "Edit Inventory Audit" : "Inventory Audit Entry" }]} />

      <div className="space-y-4">
        <Card title="Audit Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label required>Audit Name</Label>
              <ReactSelect
                options={auditNameOptions}
                placeholder="Select"
                value={auditNameId}
                onChange={(value) => setAuditNameId(value ? String(value) : "")}
              />
              {selectedName && (
                <p className="mt-1 text-xs text-gray-500">{formatDate(selectedName.from_date)} to {formatDate(selectedName.to_date)}</p>
              )}
            </div>
            <div>
              <Label required>Store</Label>
              <ReactSelect options={stores} placeholder="Select" value={storeId} isDisabled={lockPlace || !!editId} onChange={(value) => changeStore(value ? String(value) : "")} />
            </div>
            <div>
              <Label required>Location</Label>
              <ReactSelect options={locations} placeholder="Select" value={locationId} isDisabled={lockPlace} onChange={(value) => setLocationId(value ? String(value) : "")} />
              {lockPlace && <p className="mt-1 text-xs text-gray-500">Remove all rows to change store / location.</p>}
            </div>
            <div>
              <Label>Remarks</Label>
              <input type="text" value={remarks} maxLength={255} onChange={(e) => setRemarks(e.target.value)} className={inputClass} />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
          <Card title="Scan Barcode">
            <div className="flex gap-2">
              <input
                ref={scanRef}
                type="text"
                value={barcode}
                disabled={!ready}
                placeholder={ready ? "Scan or type a barcode and press Enter" : "Select audit name, store and location first"}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={scanOnEnter}
                className={`${inputClass} h-11 font-mono text-base`}
              />
              <Button type="button" onClick={scan} disabled={!ready} className="h-11 shrink-0">{scanning ? "..." : "Add"}</Button>
            </div>
            {lastScan && (
              <div
                className={`mt-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                  lastScan.ok
                    ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                    : "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400"
                }`}
              >
                {lastScan.ok ? <FiCheckCircle className="shrink-0" /> : <FiAlertTriangle className="shrink-0" />}
                <span className="truncate">{lastScan.text}</span>
              </div>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:w-[560px]">
            <Stat label="Items" value={lines.length} tone="brand" />
            <Stat label="ERP Qty" value={totals.erp} />
            <Stat label="Physical Qty" value={totals.physical} />
            <Stat label="Short" value={totals.short} tone={totals.short ? "error" : "gray"} />
            <Stat label="Excess" value={totals.excess} tone={totals.excess ? "warning" : "gray"} />
          </div>
        </div>

        <Card title={`Count List (${lines.length})`}>
          <div className="custom-scrollbar max-h-[420px] overflow-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-2 py-2 font-medium">SL</th>
                  <th className="px-2 py-2 font-medium">Product Name</th>
                  <th className="px-2 py-2 font-medium">Part Number</th>
                  <th className="px-2 py-2 font-medium">Barcode</th>
                  <th className="px-2 py-2 font-medium">ERP Location</th>
                  <th className="px-2 py-2 text-right font-medium">ERP Qty</th>
                  <th className="px-2 py-2 text-center font-medium">Physical Qty</th>
                  <th className="px-2 py-2 text-right font-medium">Difference</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      {ready ? "Scan the first barcode to start counting" : "Select audit name, store and location, then scan"}
                    </td>
                  </tr>
                )}
                {lines.map((line, index) => {
                    const diff = line.physical_qty - line.erp_qty;
                    // the ERP has this barcode in another location
                    const otherPlace = String(line.location_id ?? "") !== locationId;
                    return (
                      <tr key={line.barcode} className={`text-gray-700 transition-colors dark:text-gray-300 ${flash === line.barcode ? "bg-success-50 dark:bg-success-500/10" : ""}`}>
                        <td className="px-2 py-1.5">{index + 1}</td>
                        <td className="px-2 py-1.5">{line.product_name}</td>
                        <td className="px-2 py-1.5">{line.part_number}</td>
                        <td className="px-2 py-1.5 font-mono text-xs">{line.barcode}</td>
                        <td className="px-2 py-1.5">
                          {otherPlace ? (
                            <span className="rounded bg-error-50 px-1.5 py-0.5 text-xs text-error-600 dark:bg-error-500/10 dark:text-error-400" title="The ERP has this barcode in another location">
                              {line.location_name || "No location"}
                            </span>
                          ) : (
                            line.location_name
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right">{line.erp_qty}</td>
                        <td className="px-2 py-1.5">
                          <div className="mx-auto flex w-[120px] items-center">
                            <button type="button" title="Less" onClick={() => setQty(line.barcode, line.physical_qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-l-md border border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/5">
                              <FiMinus size={12} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={line.physical_qty}
                              onChange={(e) => setQty(line.barcode, inputNumber(e.target.value))}
                              onWheel={blurOnWheel}
                              onKeyDown={backToScanOnEnter}
                              className="h-8 w-full border-y border-gray-300 bg-transparent text-center text-sm font-semibold text-gray-800 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                            />
                            <button type="button" title="More" onClick={() => setQty(line.barcode, line.physical_qty + 1)} className="flex h-8 w-8 items-center justify-center rounded-r-md border border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/5">
                              <FiPlus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className={`px-2 py-1.5 text-right font-semibold ${diffClass(diff)}`}>{diffText(diff)}</td>
                        <td className="px-2 py-1.5 text-right">
                          <button type="button" title="Remove" onClick={() => removeLine(line.barcode)} className="rounded p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10">
                            <FiTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>

        {notScanned.length > 0 && (
          <Card
            title={`Not Scanned Yet (${notScanned.length})`}
            right={
              <Button type="button" size="sm" variant="outline" onClick={() => addMissingAsZero(notScanned)}>
                Add all as 0 (not found)
              </Button>
            }
          >
            <p className="mb-2 text-xs text-gray-500">The ERP has these barcodes in this location. Scan them if you find them, or add them as 0 when they are missing.</p>
            <div className="custom-scrollbar max-h-[240px] overflow-auto">
              <table className="w-full min-w-[700px] text-[13px]">
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {notScanned.map((item) => (
                    <tr key={item.barcode} className="text-gray-600 dark:text-gray-400">
                      <td className="px-2 py-1.5">{item.product_name}</td>
                      <td className="px-2 py-1.5">{item.part_number}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">{item.barcode}</td>
                      <td className="px-2 py-1.5 text-right">ERP {item.erp_qty}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button type="button" onClick={() => addMissingAsZero([item])} className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
                          Add as 0
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start">
          <Button type="button" onClick={save} disabled={saving || lines.length === 0}>
            {saveLabel}
          </Button>
        </div>
      </div>

      <InventoryAuditViewModal auditId={savedId} onClose={closeView} />
    </div>
  );
}

export default function InventoryAuditPage() {
  return (
    <AccessRoute requiredPermissions={["inventory-audit.create", "inventory-audit.edit"]}>
      <Suspense fallback={null}>
        <InventoryAuditForm />
      </Suspense>
    </AccessRoute>
  );
}
