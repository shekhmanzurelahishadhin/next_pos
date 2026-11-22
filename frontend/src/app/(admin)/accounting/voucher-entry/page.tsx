"use client";
// Voucher Entry, like parts_bazar accounting/journalEntry (bankPaymentCreate, cashReceiveCreate ...).
// One page for the 6 voucher types: the type is picked from the tabs on top.
// Lines are added to a list, the Dr total and the Cr total must be the same to save.
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { FiArrowLeft, FiPlus, FiTrash2 } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import { formatMoney } from "@/lib/format";
import { apiErrorMessage, blurOnWheel, loadOptions, Option } from "@/lib/options";
import { accountingSetupService } from "@/services/accountingSetupService";
import {
  BILL_TYPES,
  CHEQUE_TYPES,
  CREDIT,
  DEBIT,
  journalEntryService,
  PAYMENT_TYPES,
  VOUCHER_TABS,
  VoucherLine,
} from "@/services/journalEntryService";

const BDT = "3";
// the last used voucher type is opened next time
const LAST_TYPE_KEY = "voucher-entry-type";

const DR_CR = [
  { value: String(DEBIT), label: "Dr" },
  { value: String(CREDIT), label: "Cr" },
];

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const readOnlyClass =
  "flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300";

// today in local time as "2026-11-22"
function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function toNumber(value: string) {
  const number = Number(value);
  if (isNaN(number)) {
    return 0;
  }
  return number;
}

function savedType() {
  try {
    const value = Number(window.localStorage.getItem(LAST_TYPE_KEY));
    for (const tab of VOUCHER_TABS) {
      if (tab.id === value) {
        return value;
      }
    }
  } catch {
    // no storage, use the first tab
  }
  return VOUCHER_TABS[0].id;
}

function saveType(value: number) {
  try {
    window.localStorage.setItem(LAST_TYPE_KEY, String(value));
  } catch {
    // no storage, nothing to remember
  }
}

// useSearchParams needs a Suspense boundary
export default function VoucherEntryPage() {
  return (
    <Suspense fallback={null}>
      <VoucherEntryForm />
    </Suspense>
  );
}

function VoucherEntryForm() {
  const { confirm } = useAlert();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?type=3&no=2611001 opens that voucher to update (from Voucher Manage)
  const editType = Number(searchParams.get("type") || 0);
  const editNo = searchParams.get("no") || "";
  const isEdit = editType > 0 && editNo !== "";
  const [editVoucherNo, setEditVoucherNo] = useState("");
  const [editBlocked, setEditBlocked] = useState("");

  const [voucherType, setVoucherType] = useState(VOUCHER_TABS[0].id);

  const [companies, setCompanies] = useState<Option[]>([]);
  const [currencies, setCurrencies] = useState<Option[]>([]);
  const [heads, setHeads] = useState<{ value: number; label: string }[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [entryDate, setEntryDate] = useState(localToday());
  const [currencyId, setCurrencyId] = useState(BDT);
  const [rate, setRate] = useState<number | null>(null); // null = not looked up yet
  const [nextNo, setNextNo] = useState("");

  const [billNo, setBillNo] = useState("");
  const [chalanNo, setChalanNo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [payTo, setPayTo] = useState("");
  const [narration, setNarration] = useState("");

  // the line being added
  const [caId, setCaId] = useState<number | null>(null);
  const [side, setSide] = useState(String(DEBIT));
  const [amount, setAmount] = useState("");

  const [lines, setLines] = useState<VoucherLine[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // the cheque date picker is rebuilt after a save, so it shows the cleared value
  const [formKey, setFormKey] = useState(0);

  const hasBill = BILL_TYPES.includes(voucherType);
  const hasCheque = CHEQUE_TYPES.includes(voucherType);

  let currentTab = VOUCHER_TABS[0];
  for (const tab of VOUCHER_TABS) {
    if (tab.id === voucherType) {
      currentTab = tab;
    }
  }

  useEffect(() => {
    if (isEdit) {
      document.title = "Update Voucher | Multibrand POS";
      setVoucherType(editType);
    } else {
      document.title = "Voucher Entry | Multibrand POS";
      setVoucherType(savedType());
    }
  }, [isEdit, editType]);

  // update: fill the form with the voucher
  useEffect(() => {
    if (!isEdit) {
      return;
    }
    journalEntryService
      .getVoucher(editType, editNo)
      .then((detail) => {
        setEditVoucherNo(detail.voucher_no);
        if (detail.entry_source_type !== 1) {
          setEditBlocked("This voucher was made by the software from another entry, it can not be updated here.");
        } else if (detail.is_locked) {
          setEditBlocked("This voucher is locked, it can not be updated. Unlock it in Voucher Manage first.");
        }
        if (detail.company_id) {
          setCompanyId(String(detail.company_id));
        }
        setEntryDate(detail.entry_date);
        setCurrencyId(String(detail.currency_id));
        setNarration(detail.narration || "");
        setBillNo(detail.bill_no || "");
        setChalanNo(detail.chalan_no || "");
        setChequeNo(detail.cheque_no || "");
        setChequeDate(detail.cheque_date || "");
        setPaymentType(detail.payment_type ? String(detail.payment_type) : "");
        setPayTo(detail.pay_to || "");

        const oldLines: VoucherLine[] = [];
        for (const line of detail.lines) {
          if (!line.account) {
            continue;
          }
          oldLines.push({
            ca_id: line.account.id,
            title: line.account.title + " (" + line.account.code + ")",
            transaction_type: line.transaction_type,
            // the amount as it was typed, in the voucher currency
            amount: String(Number(line.amount_in_foreign_currency)),
          });
        }
        setLines(oldLines);
        // rebuild the date pickers with the voucher dates
        setFormKey((old) => old + 1);
      })
      .catch((err) => setEditBlocked(apiErrorMessage(err, "No result found !")));
  }, [isEdit, editType, editNo]);

  // companies, currencies and account titles (the same titles for every voucher type)
  useEffect(() => {
    loadOptions("/configure/companies")
      .then((list) => {
        setCompanies(list);
        if (list.length > 0) {
          // keep the company of a voucher being updated
          setCompanyId((old) => {
            if (old) {
              return old;
            }
            return list[0].value;
          });
        }
      })
      .catch(() => toast.error("Failed to load the companies"));
    accountingSetupService
      .currencies()
      .then((list) => setCurrencies(list))
      .catch(() => toast.error("Failed to load the currencies"));
    journalEntryService
      .heads(VOUCHER_TABS[0].id)
      .then((data) => setHeads(data.heads))
      .catch(() => toast.error("Failed to load the account titles"));
  }, []);

  // rate of the currency on the entry date
  useEffect(() => {
    if (!currencyId || !entryDate) {
      setRate(null);
      return;
    }
    let stillWanted = true;
    accountingSetupService
      .rateOn(currencyId, entryDate)
      .then((found) => {
        if (stillWanted) {
          setRate(found);
        }
      })
      .catch(() => {
        if (stillWanted) {
          setRate(0);
        }
      });
    return () => {
      stillWanted = false;
    };
  }, [currencyId, entryDate]);

  // the voucher no the next save will get
  const loadNextNo = useCallback(() => {
    // an updated voucher keeps its own no
    if (isEdit) {
      return;
    }
    if (!entryDate) {
      setNextNo("");
      return;
    }
    journalEntryService
      .nextNo(voucherType, entryDate)
      .then((voucherNo) => setNextNo(voucherNo))
      .catch(() => setNextNo(""));
  }, [voucherType, entryDate, isEdit]);

  useEffect(() => {
    loadNextNo();
  }, [loadNextNo]);

  const changeEntryDate = useCallback((_dates: Date[], value: string) => {
    setEntryDate(value);
  }, []);
  const changeChequeDate = useCallback((_dates: Date[], value: string) => {
    setChequeDate(value);
  }, []);

  // totals of the list
  let totalDr = 0;
  let totalCr = 0;
  for (const line of lines) {
    if (line.transaction_type === DEBIT) {
      totalDr = totalDr + toNumber(line.amount);
    } else {
      totalCr = totalCr + toNumber(line.amount);
    }
  }
  totalDr = Math.round(totalDr * 100) / 100;
  totalCr = Math.round(totalCr * 100) / 100;
  const difference = Math.round((totalDr - totalCr) * 100) / 100;

  function headTitle(id: number) {
    for (const head of heads) {
      if (head.value === id) {
        return head.label;
      }
    }
    return "";
  }

  // a voucher is one type, so the list is cleared when the type changes
  async function changeType(newType: number) {
    // the type of a saved voucher can not change
    if (newType === voucherType || isEdit) {
      return;
    }
    if (lines.length > 0) {
      const result = await confirm({ title: "Change Voucher Type?", text: "The added lines will be cleared." });
      if (!result.isConfirmed) {
        return;
      }
    }
    clearVoucher();
    setVoucherType(newType);
    saveType(newType);
  }

  function addLine() {
    setError("");
    if (!caId) {
      setError("Please select an account title!");
      return;
    }
    if (!(toNumber(amount) > 0)) {
      setError("Please Input Amount!");
      return;
    }
    for (const line of lines) {
      if (line.ca_id === caId) {
        setError("Already added!");
        return;
      }
    }

    const newLine: VoucherLine = { ca_id: caId, title: headTitle(caId), transaction_type: Number(side), amount: amount };
    const newLines = [...lines, newLine];
    setLines(newLines);

    // the next line gets the side and the amount that balance the list
    let newDr = 0;
    let newCr = 0;
    for (const line of newLines) {
      if (line.transaction_type === DEBIT) {
        newDr = newDr + toNumber(line.amount);
      } else {
        newCr = newCr + toNumber(line.amount);
      }
    }
    const newDifference = Math.round((newDr - newCr) * 100) / 100;
    if (newDifference > 0) {
      setSide(String(CREDIT));
      setAmount(String(newDifference));
    } else if (newDifference < 0) {
      setSide(String(DEBIT));
      setAmount(String(-newDifference));
    } else {
      setSide(String(CREDIT));
      setAmount("");
    }
    setCaId(null);
  }

  function changeLineAmount(index: number, value: string) {
    const newLines: VoucherLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === index) {
        newLines.push({ ...lines[i], amount: value });
      } else {
        newLines.push(lines[i]);
      }
    }
    setLines(newLines);
  }

  async function removeLine(index: number) {
    let sideName = "Credit";
    if (lines[index].transaction_type === DEBIT) {
      sideName = "Debit";
    }
    const result = await confirm({ title: "Delete " + sideName + " Entry?", text: "Are you sure you want to Delete " + sideName + " Entry? (" + lines[index].title + ")" });
    if (!result.isConfirmed) {
      return;
    }
    const newLines: VoucherLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (i !== index) {
        newLines.push(lines[i]);
      }
    }
    setLines(newLines);
  }

  function clearVoucher() {
    setLines([]);
    setNarration("");
    setBillNo("");
    setChalanNo("");
    setChequeNo("");
    setChequeDate("");
    setPaymentType("");
    setPayTo("");
    setCaId(null);
    setSide(String(DEBIT));
    setAmount("");
    setError("");
    setFormKey(formKey + 1);
  }

  async function save() {
    setError("");
    if (!companyId) {
      setError("Company cannot be blank.");
      return;
    }
    if (!entryDate) {
      setError("Entry Date cannot be blank.");
      return;
    }
    if (!currencyId) {
      setError("Currency cannot be blank.");
      return;
    }
    if (rate !== null && rate <= 0) {
      setError("No conversion rate of this currency for the Entry Date. Add it in Currency first.");
      return;
    }
    if (totalDr === 0 || totalCr === 0) {
      setError("Please add journal entries to the list!");
      return;
    }
    for (const line of lines) {
      if (!(toNumber(line.amount) > 0)) {
        setError("Please Input Amount! (" + line.title + ")");
        return;
      }
    }
    if (difference !== 0) {
      setError("Debit & Credit Balance is not equal!");
      return;
    }

    const payloadLines = [];
    for (const line of lines) {
      payloadLines.push({ ca_id: line.ca_id, transaction_type: line.transaction_type, amount: line.amount });
    }

    if (editBlocked) {
      setError(editBlocked);
      return;
    }

    const payload = {
      company_id: companyId,
      voucher_type: voucherType,
      entry_date: entryDate,
      currency_id: currencyId,
      narration: narration,
      bill_no: billNo,
      chalan_no: chalanNo,
      cheque_no: chequeNo,
      cheque_date: chequeDate,
      payment_type: paymentType,
      pay_to: payTo,
      lines: payloadLines,
    };

    if (isEdit) {
      try {
        setSaving(true);
        const result = await journalEntryService.updateVoucher(editType, editNo, payload);
        toast.success(result.voucher_no + " successfully updated");
        router.push("/accounting/voucher-manage");
      } catch (err) {
        setError(apiErrorMessage(err, "Data not saved. Please solve the above errors!"));
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      setSaving(true);
      const result = await journalEntryService.save({
        company_id: companyId,
        voucher_type: voucherType,
        entry_date: entryDate,
        currency_id: currencyId,
        narration: narration,
        bill_no: billNo,
        chalan_no: chalanNo,
        cheque_no: chequeNo,
        cheque_date: chequeDate,
        payment_type: paymentType,
        pay_to: payTo,
        lines: payloadLines,
      });
      toast.success("Successfully Saved: " + result.voucher_no);
      // company, date, currency and type stay for the next voucher
      clearVoucher();
      loadNextNo();
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved. Please solve the above errors!"));
    } finally {
      setSaving(false);
    }
  }

  let rateText = "—";
  if (rate !== null && rate > 0) {
    rateText = String(rate);
  }
  if (rate === 0) {
    rateText = "No rate for this date";
  }

  let differenceClass = "text-success-600 dark:text-success-500";
  if (difference !== 0) {
    differenceClass = "text-error-600 dark:text-error-400";
  }

  let saveLabel = "Save " + currentTab.label + " Voucher";
  if (isEdit) {
    saveLabel = "Update " + currentTab.label + " Voucher";
  }
  if (saving) {
    saveLabel = "Saving...";
  }

  let pageTitle = "Voucher Entry";
  let pageDesc = "Pick the voucher type, add the Dr and Cr lines, and save when Total Dr and Total Cr are the same.";
  let permissions = ["voucher-entry.create"];
  if (isEdit) {
    pageTitle = "Update Voucher " + editVoucherNo;
    pageDesc = "Change the lines and save. The voucher type and voucher no stay the same.";
    permissions = ["voucher-entry.edit"];
  }

  // the Back button shows only for a user who can open Voucher Manage
  const canManage = hasPermission("voucher-entry.view") || hasPermission("voucher-entry.edit") || hasPermission("voucher-entry.delete");

  let voucherNoText = nextNo || "Will Auto Generate";
  if (isEdit) {
    voucherNoText = editVoucherNo;
  }

  return (
    <AccessRoute requiredPermissions={permissions}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: pageTitle }]} />
        <ComponentCard
          title={pageTitle}
          desc={pageDesc}
          headerAction={
            canManage && (
              <Button type="button" size="sm" variant="outline" startIcon={<FiArrowLeft />} onClick={() => router.push("/accounting/voucher-manage")}>
                Voucher Manage
              </Button>
            )
          }
        >
          <div className="space-y-5">
            {editBlocked && (
              <div className="rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400">{editBlocked}</div>
            )}

            {/* voucher type tabs, only the voucher's own type when updating */}
            <div>
              <div className="flex flex-wrap gap-2">
                {VOUCHER_TABS.map((tab) => {
                  let tabClass = "border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300";
                  if (tab.id === voucherType) {
                    tabClass = "border-brand-500 bg-brand-500 text-white shadow-theme-xs";
                  } else if (isEdit) {
                    tabClass = "cursor-not-allowed border-gray-200 text-gray-300 dark:border-gray-800 dark:text-gray-600";
                  }
                  return (
                    <button key={tab.id} type="button" disabled={isEdit && tab.id !== voucherType} onClick={() => changeType(tab.id)} className={"rounded-lg border px-4 py-2 text-sm font-medium transition " + tabClass}>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{currentTab.hint}</p>
            </div>

            {/* voucher info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label required>Company</Label>
                <ReactSelect options={companies} value={companyId || null} isClearable={false} placeholder="select" onChange={(value) => setCompanyId(value ? String(value) : "")} />
              </div>
              <div>
                <Label required>Entry Date</Label>
                <DatePicker key={"entry-date-" + formKey} id="entry_date" defaultDate={entryDate || undefined} onChange={changeEntryDate} placeholder="Select date" />
              </div>
              <div>
                <Label>Voucher No</Label>
                <div className={readOnlyClass} title="Will Auto Generate on save">
                  <span className="font-mono">{voucherNoText}</span>
                </div>
              </div>
              <div>
                <Label required>Currency</Label>
                <ReactSelect options={currencies} value={currencyId || null} isClearable={false} placeholder="select" isDisabled={lines.length > 0} onChange={(value) => setCurrencyId(value ? String(value) : "")} />
              </div>
              <div>
                <Label>Conversion Rate</Label>
                <div className={readOnlyClass}>{rateText}</div>
              </div>
            </div>

            {hasCheque && (
              <div key={"cheque-" + formKey} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Cheque No</Label>
                  <input type="text" value={chequeNo} maxLength={255} onChange={(e) => setChequeNo(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label>Cheque Date</Label>
                  <DatePicker id="cheque_date" defaultDate={chequeDate || undefined} onChange={changeChequeDate} placeholder="Select date" />
                </div>
                <div>
                  <Label>Payment Type</Label>
                  <ReactSelect options={PAYMENT_TYPES} value={paymentType || null} placeholder="Select" onChange={(value) => setPaymentType(value ? String(value) : "")} />
                </div>
                <div>
                  <Label>Pay To</Label>
                  <input type="text" value={payTo} maxLength={255} onChange={(e) => setPayTo(e.target.value)} className={inputClass} />
                </div>
              </div>
            )}

            {hasBill && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Bill No</Label>
                  <input type="text" value={billNo} maxLength={255} onChange={(e) => setBillNo(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label>Chalan No</Label>
                  <input type="text" value={chalanNo} maxLength={255} onChange={(e) => setChalanNo(e.target.value)} className={inputClass} />
                </div>
              </div>
            )}

            {/* add a line */}
            <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                <div className="md:col-span-6">
                  <Label required>Account Title</Label>
                  <ReactSelect options={heads} value={caId} placeholder="Type to search" onChange={(value) => setCaId(value ? Number(value) : null)} />
                </div>
                <div className="md:col-span-2">
                  <Label required>Dr / Cr</Label>
                  <ReactSelect options={DR_CR} value={side} isClearable={false} isSearchable={false} onChange={(value) => setSide(value ? String(value) : String(DEBIT))} />
                </div>
                <div className="md:col-span-2">
                  <Label required>Amount</Label>
                  <input
                    type="number"
                    value={amount}
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    onWheel={blurOnWheel}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addLine();
                      }
                    }}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="button" size="sm" className="h-10 w-full" onClick={addLine} startIcon={<FiPlus />}>
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
            )}

            {/* added list */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
                  <tr>
                    <th className="w-12 px-3 py-2.5">SL</th>
                    <th className="px-3 py-2.5">Account Title</th>
                    <th className="w-44 px-3 py-2.5 text-right">Dr (Amount)</th>
                    <th className="w-44 px-3 py-2.5 text-right">Cr (Amount)</th>
                    <th className="w-16 px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-400">No line added yet.</td>
                    </tr>
                  )}
                  {lines.map((line, index) => (
                    <tr key={line.ca_id} className="text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">{line.title}</td>
                      <td className="px-3 py-2">
                        {line.transaction_type === DEBIT && (
                          <input type="number" value={line.amount} min={0} step="0.01" onWheel={blurOnWheel} onChange={(e) => changeLineAmount(index, e.target.value)} className={inputClass + " h-9 text-right"} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {line.transaction_type === CREDIT && (
                          <input type="number" value={line.amount} min={0} step="0.01" onWheel={blurOnWheel} onChange={(e) => changeLineAmount(index, e.target.value)} className={inputClass + " h-9 text-right"} />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" title="Remove" onClick={() => removeLine(index)} className="rounded-md p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10">
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-gray-800 dark:bg-white/[0.03] dark:text-white/90">
                  <tr>
                    <td colSpan={2} className="px-3 py-2.5 text-right">Total</td>
                    <td className="px-3 py-2.5 text-right">{formatMoney(totalDr)}</td>
                    <td className="px-3 py-2.5 text-right">{formatMoney(totalCr)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="px-3 py-2.5 text-right">Difference</td>
                    <td colSpan={2} className={"px-3 py-2.5 text-center " + differenceClass}>{formatMoney(difference)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <Label>Narration</Label>
              <textarea value={narration} maxLength={512} rows={2} onChange={(e) => setNarration(e.target.value)} className={inputClass + " h-auto py-2"} />
            </div>

            <div className="flex justify-end gap-3">
              {isEdit && <Button type="button" size="sm" variant="outline" onClick={() => router.push("/accounting/voucher-manage")}>Cancel</Button>}
              {!isEdit && <Button type="button" size="sm" variant="outline" onClick={clearVoucher}>Clear</Button>}
              <Button type="button" size="sm" onClick={save} disabled={saving || editBlocked !== ""}>{saveLabel}</Button>
            </div>
          </div>
        </ComponentCard>
      </div>
    </AccessRoute>
  );
}
