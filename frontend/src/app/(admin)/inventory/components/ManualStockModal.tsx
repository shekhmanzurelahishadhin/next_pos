"use client";
// Manual stock in / out, like parts_bazar inventory/create on the Inventory Stock page:
// Stock In  = store, location, part number, purchase price and qty -> a new barcode
// Stock Out = an existing barcode and qty (not more than its closing stock), at the barcode's purchase price
// Both write an Inventory Adjustment journal.
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import DatePicker from "@/components/form/date-picker";
import Autocomplete from "@/components/form/Autocomplete";
import { apiErrorMessage, blurOnWheel, loadOptions, Option, today } from "@/lib/options";
import { formatMoney } from "@/lib/format";
import { inventoryService, ManualBarcodeHit, ManualProductHit } from "@/services/inventoryService";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const readOnlyClass = "flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.05] dark:text-gray-300";

const TYPES: Option[] = [
  { value: "in", label: "Stock In" },
  { value: "out", label: "Stock Out" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ManualStockModal({ isOpen, onClose, onSaved }: Props) {
  const [type, setType] = useState("in");
  const [date, setDate] = useState(today());
  const [stores, setStores] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [storeId, setStoreId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [productText, setProductText] = useState("");
  const [product, setProduct] = useState<ManualProductHit | null>(null);
  const [barcodeText, setBarcodeText] = useState("");
  const [barcode, setBarcode] = useState<ManualBarcodeHit | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [qty, setQty] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // a fresh form each time it opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    changeType("in");
    setDate(today());
    setStoreId("");
    setLocations([]);
    setRemarks("");
    loadOptions("/configure/stores")
      .then(setStores)
      .catch(() => toast.error("Failed to load stores"));
  }, [isOpen]);

  // parts_bazar: a new type clears the product / barcode, price, stock and qty
  function changeType(value: string) {
    setType(value);
    setProductText("");
    setProduct(null);
    setBarcodeText("");
    setBarcode(null);
    setPurchasePrice("");
    setQty("");
    setError("");
  }

  function changeStore(value: string) {
    setStoreId(value);
    setLocationId("");
    setLocations([]);
    setProductText("");
    setProduct(null);
    if (value) {
      loadOptions("/configure/locations", { store_id: value })
        .then(setLocations)
        .catch(() => toast.error("Failed to load locations"));
    }
  }

  function changeLocation(value: string) {
    setLocationId(value);
    setProductText("");
    setProduct(null);
  }

  // parts_bazar asks for the store and location before the part number
  function canSearchProduct() {
    if (!storeId) {
      toast.error("Please Select Store");
      return false;
    }
    if (!locationId) {
      toast.error("Please Select Location");
      return false;
    }
    return true;
  }

  function selectProduct(hit: ManualProductHit) {
    setProduct(hit);
    setProductText(hit.part_number);
    // the latest purchase price comes in, it can be changed
    if (hit.purchase_price > 0) {
      setPurchasePrice(String(hit.purchase_price));
    }
  }

  function selectBarcode(hit: ManualBarcodeHit) {
    setBarcode(hit);
    setBarcodeText(hit.barcode);
  }

  async function save() {
    setError("");
    if (!date) {
      setError("Date cannot be blank.");
      return;
    }
    // the fields are checked from the top of the form down
    if (type === "out") {
      if (!barcode) {
        setError("Barcode cannot be blank.");
        return;
      }
    } else {
      if (!storeId) {
        setError("Store cannot be blank.");
        return;
      }
      if (!locationId) {
        setError("Location cannot be blank.");
        return;
      }
      if (!product) {
        setError("Product cannot be blank.");
        return;
      }
      if (!purchasePrice || !(Number(purchasePrice) > 0)) {
        setError("Purchase Price cannot be blank.");
        return;
      }
    }
    const qtyNumber = Number(qty);
    if (!qty || !(qtyNumber > 0)) {
      setError("Invalid Stock In");
      return;
    }
    if (type === "out" && barcode && qtyNumber > barcode.stock) {
      setError("Stock-in quantity cannot be greater than closing stock.");
      return;
    }

    try {
      setSaving(true);
      if (type === "out" && barcode) {
        await inventoryService.saveManualStock({ type: "out", transaction_date: date, qty: qty, remarks: remarks, barcode: barcode.barcode });
      } else if (product) {
        await inventoryService.saveManualStock({
          type: "in",
          transaction_date: date,
          qty: qty,
          remarks: remarks,
          store_id: storeId,
          location_id: locationId,
          product_id: product.id,
          purchase_price: purchasePrice,
        });
      }
      toast.success("Data saved successfully.");
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved. Please solve the above errors."));
    } finally {
      setSaving(false);
    }
  }

  let amount = 0;
  if (type === "out" && barcode) {
    amount = barcode.purchase_price * (Number(qty) || 0);
  } else {
    amount = (Number(purchasePrice) || 0) * (Number(qty) || 0);
  }

  let saveLabel = "Save";
  if (saving) {
    saveLabel = "Saving...";
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
      title="Manual Stock In / Out"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>{saveLabel}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Type</Label>
            <ReactSelect options={TYPES} value={type} isClearable={false} onChange={(value) => changeType(value ? String(value) : "in")} />
          </div>
          <div>
            <Label required>Date</Label>
            <DatePicker id="manual_stock_date" defaultDate={date} onChange={(_dates: Date[], dateStr: string) => setDate(dateStr)} placeholder="Select date" />
          </div>
        </div>

        {type === "in" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label required>Store</Label>
              <ReactSelect options={stores} value={storeId || null} placeholder="Select" onChange={(value) => changeStore(value ? String(value) : "")} />
            </div>
            <div>
              <Label required>Location</Label>
              <ReactSelect options={locations} value={locationId || null} placeholder="Select" isDisabled={!storeId} onChange={(value) => changeLocation(value ? String(value) : "")} />
            </div>
            <div className="sm:col-span-2">
              <Label required>Part Number</Label>
              <Autocomplete
                value={productText}
                onChange={(text) => {
                  setProductText(text);
                  setProduct(null);
                }}
                canSearch={canSearchProduct}
                search={(term) => inventoryService.searchManualProducts(term, storeId, locationId)}
                onSelect={selectProduct}
                placeholder="Type the part number"
                renderItem={(hit) => (
                  <div>
                    <div className="font-medium">{hit.part_number}</div>
                    <div className="text-xs text-gray-500">{hit.name} · Stock {hit.stock}</div>
                  </div>
                )}
              />
            </div>
            <div>
              <Label>Product</Label>
              <div className={readOnlyClass}>{product ? product.name : ""}</div>
            </div>
            <div>
              <Label>Closing Stock (this location)</Label>
              <div className={readOnlyClass}>{product ? product.stock : ""}</div>
            </div>
            <div>
              <Label required>Purchase Price</Label>
              <input type="number" min="0" step="any" value={purchasePrice} onWheel={blurOnWheel} onChange={(e) => setPurchasePrice(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label>Sell Price (active)</Label>
              <div className={readOnlyClass}>{product && product.sell_price > 0 ? formatMoney(product.sell_price) : ""}</div>
            </div>
          </div>
        )}

        {type === "out" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label required>Barcode</Label>
              <Autocomplete
                value={barcodeText}
                onChange={(text) => {
                  setBarcodeText(text);
                  setBarcode(null);
                }}
                search={(term) => inventoryService.searchManualBarcodes(term)}
                onSelect={selectBarcode}
                placeholder="Type the barcode"
                renderItem={(hit) => (
                  <div>
                    <div className="font-mono font-medium">{hit.barcode}</div>
                    <div className="text-xs text-gray-500">
                      {hit.product_name} · {hit.store_name} / {hit.location_name} · Stock {hit.stock}
                    </div>
                  </div>
                )}
              />
            </div>
            <div>
              <Label>Product</Label>
              <div className={readOnlyClass}>{barcode ? barcode.product_name + " (" + barcode.part_number + ")" : ""}</div>
            </div>
            <div>
              <Label>Store / Location</Label>
              <div className={readOnlyClass}>{barcode ? barcode.store_name + " / " + barcode.location_name : ""}</div>
            </div>
            <div>
              <Label>Purchase Price</Label>
              <div className={readOnlyClass}>{barcode ? formatMoney(barcode.purchase_price) : ""}</div>
            </div>
            <div>
              <Label>Closing Stock</Label>
              <div className={readOnlyClass}>{barcode ? barcode.stock : ""}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>{type === "out" ? "Stock Out Qty" : "Stock In Qty"}</Label>
            <input type="number" min="0" step="any" value={qty} onWheel={blurOnWheel} onChange={(e) => setQty(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label>Amount (Inventory Adjustment)</Label>
            <div className={readOnlyClass}>{amount > 0 ? formatMoney(amount) : ""}</div>
          </div>
          <div className="sm:col-span-2">
            <Label>Remarks</Label>
            <input type="text" maxLength={255} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
