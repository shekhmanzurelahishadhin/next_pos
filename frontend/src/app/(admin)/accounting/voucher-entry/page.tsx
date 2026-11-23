"use client";
// Voucher Entry, like parts_bazar accounting/journalEntry (bankPaymentCreate, cashReceiveCreate ...).
// One page for the 6 voucher types: the type is picked from the tabs on top.
// A line is added from the add form (Account, Cost Center, Dr / Cr, Amount) and goes to the grid
// below, where its amount can still be changed. The summary on the right shows the
// voucher no and the totals; the voucher can be saved when Total Dr and Total Cr are the same.
// Bank Payment and Contra can take a cheque from the Cheque Book: it becomes USED on save.
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { FiArrowLeft, FiCheckCircle, FiPlus, FiTrash2 } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import { formatMoney } from "@/lib/format";
import { apiErrorMessage, blurOnWheel, loadOptions, Option } from "@/lib/options";
import { accountingSetupService } from "@/services/accountingSetupService";
import { ActiveCheque, chequeBookService } from "@/services/chequeBookService";
import { AccountAutocomplete, AccountAutocompleteHandle } from "./AccountAutocomplete";
import {
  BILL_TYPES,
  CHEQUE_TYPES,
  costCenterName,
  CREDIT,
  DEBIT,
  journalEntryService,
  PAYMENT_TYPES,
  VOUCHER_TABS,
  VoucherLine,
  VoucherPayload,
} from "@/services/journalEntryService";

const BDT = "3";

const DR_CR = [
  { value: String(DEBIT), label: "Dr" },
  { value: String(CREDIT), label: "Cr" },
];
// the last used voucher type is opened next time
const LAST_TYPE_KEY = "voucher-entry-type";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-white/[0.03]";

const amountClass = inputClass + " text-right font-medium";

const cardClass = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";

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

// Dr total, Cr total and Dr - Cr of the lines, rounded to paisa
function totalsOf(list: VoucherLine[]) {
  let dr = 0;
  let cr = 0;
  for (const line of list) {
    if (line.transaction_type === DEBIT) {
      dr = dr + toNumber(line.amount);
    } else {
      cr = cr + toNumber(line.amount);
    }
  }
  dr = Math.round(dr * 100) / 100;
  cr = Math.round(cr * 100) / 100;
  return { dr: dr, cr: cr, difference: Math.round((dr - cr) * 100) / 100 };
}

function chequeLabel(cheque: ActiveCheque) {
  let label = cheque.cheque_no;
  if (cheque.bank_name) {
    label = label + " — " + cheque.bank_name;
  }
  return label + " (Book " + cheque.book_no + ")";
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
  const [costCenters, setCostCenters] = useState<{ value: number; label: string }[]>([]);
  const [cheques, setCheques] = useState<ActiveCheque[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [entryDate, setEntryDate] = useState(localToday());
  const [currencyId, setCurrencyId] = useState(BDT);
  const [rate, setRate] = useState<number | null>(null); // null = not looked up yet
  const [nextNo, setNextNo] = useState("");

  const [billNo, setBillNo] = useState("");
  const [chalanNo, setChalanNo] = useState("");
  const [chequeId, setChequeId] = useState<number | null>(null);
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [payTo, setPayTo] = useState("");
  const [narration, setNarration] = useState("");

  // the line being added; like parts_bazar the cost center stays for the next line
  const [entryCa, setEntryCa] = useState<number | null>(null);
  const [entryCaLabel, setEntryCaLabel] = useState("");
  // like parts_bazar: the bank put by a picked cheque can not be changed until the line is added
  const [entryLocked, setEntryLocked] = useState(false);
  const accountRef = useRef<AccountAutocompleteHandle>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [entryCenter, setEntryCenter] = useState<number | null>(null);
  const [entrySide, setEntrySide] = useState(String(DEBIT));
  const [entryAmount, setEntryAmount] = useState("");

  const [lines, setLines] = useState<VoucherLine[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // the date pickers are rebuilt after a save or a load, so they show the new value
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
        if (detail.cheque_id) {
          setChequeId(detail.cheque_id);
          // the voucher's own cheque is USED, so it is not in the active list: add it (bank_id 0 marks it)
          const ownCheque: ActiveCheque = { id: detail.cheque_id, cheque_no: detail.cheque_no || "", book_no: detail.cheque_book_no || "", bank_id: 0, bank_name: "" };
          setCheques((old) => [ownCheque, ...old]);
        }

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
            cost_center_id: line.cost_center_id,
            cost_center: costCenterName(line.cost_center),
          });
        }
        setLines(oldLines);
        setFormKey((old) => old + 1);
      })
      .catch((err) => setEditBlocked(apiErrorMessage(err, "No result found !")));
  }, [isEdit, editType, editNo]);

  // companies, currencies and cost centers (account titles are searched as you type)
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
    accountingSetupService
      .costCenterOptions()
      .then((list) => setCostCenters(list))
      .catch(() => toast.error("Failed to load the cost centers"));
  }, []);

  // active cheques of the Cheque Book, only Bank Payment and Contra use them
  const loadCheques = useCallback(() => {
    chequeBookService
      .activeCheques({})
      .then((list) => {
        setCheques((old) => {
          // keep the voucher's own cheque (update) on top
          const kept: ActiveCheque[] = [];
          for (const cheque of old) {
            if (cheque.bank_id === 0) {
              kept.push(cheque);
            }
          }
          return [...kept, ...list];
        });
      })
      .catch(() => toast.error("Failed to load the cheques"));
  }, []);

  useEffect(() => {
    if (hasCheque) {
      loadCheques();
    }
  }, [hasCheque, loadCheques]);

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

  const totals = totalsOf(lines);

  function centerTitle(id: number | null) {
    if (!id) {
      return "";
    }
    for (const center of costCenters) {
      if (center.value === id) {
        return center.label;
      }
    }
    return "";
  }

  // the add form gets the side and the amount that balance the list
  function fillBalance(list: VoucherLine[]) {
    const difference = totalsOf(list).difference;
    if (difference > 0) {
      setEntrySide(String(CREDIT));
      setEntryAmount(String(difference));
    } else if (difference < 0) {
      setEntrySide(String(DEBIT));
      setEntryAmount(String(-difference));
    } else {
      setEntrySide(String(CREDIT));
      setEntryAmount("");
    }
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

  // like parts_bazar: picking a cheque puts its bank in the add form as the Cr side
  function pickCheque(value: string | number | null) {
    if (!value) {
      setChequeId(null);
      setChequeNo("");
      if (entryLocked) {
        setEntryCa(null);
        setEntryCaLabel("");
        setEntryLocked(false);
      }
      return;
    }
    const id = Number(value);
    setChequeId(id);
    for (const cheque of cheques) {
      if (cheque.id !== id) {
        continue;
      }
      setChequeNo(cheque.cheque_no);
      if (cheque.bank_id === 0) {
        continue;
      }
      let bankAdded = false;
      for (const line of lines) {
        if (line.ca_id === cheque.bank_id) {
          bankAdded = true;
        }
      }
      if (!bankAdded) {
        setEntryCa(cheque.bank_id);
        setEntryCaLabel(cheque.bank_name);
        setEntryLocked(true);
        setEntrySide(String(CREDIT));
        if (totals.difference > 0) {
          setEntryAmount(String(totals.difference));
        }
      }
    }
  }

  function addLine() {
    setError("");
    if (!entryCa) {
      setError("Please select an account title!");
      return;
    }
    if (!(toNumber(entryAmount) > 0)) {
      setError("Please Input Amount!");
      return;
    }
    // like parts_bazar, one head can come again only with another cost center
    for (const line of lines) {
      if (line.ca_id === entryCa && line.cost_center_id === entryCenter) {
        setError("Already added!");
        return;
      }
    }

    const newLine: VoucherLine = {
      ca_id: entryCa,
      title: entryCaLabel,
      transaction_type: Number(entrySide),
      amount: entryAmount,
      cost_center_id: entryCenter,
      cost_center: centerTitle(entryCenter),
    };
    const newLines = [...lines, newLine];
    setLines(newLines);
    setEntryCa(null);
    setEntryCaLabel("");
    setEntryLocked(false);
    fillBalance(newLines);
    // like parts_bazar the cursor goes back to the account title
    if (accountRef.current) {
      accountRef.current.focus();
    }
  }

  // typing in a line's Dr or Cr cell moves the line to that side
  function changeLineAmount(index: number, side: number, value: string) {
    const newLines: VoucherLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === index) {
        newLines.push({ ...lines[i], transaction_type: side, amount: value });
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
    fillBalance(newLines);
  }

  function clearVoucher() {
    setLines([]);
    setNarration("");
    setBillNo("");
    setChalanNo("");
    setChequeId(null);
    setChequeNo("");
    setChequeDate("");
    setPaymentType("");
    setPayTo("");
    setEntryCa(null);
    setEntryCaLabel("");
    setEntryLocked(false);
    setEntryCenter(null);
    setEntrySide(String(DEBIT));
    setEntryAmount("");
    setError("");
    setFormKey(formKey + 1);
  }

  async function save() {
    setError("");
    if (editBlocked) {
      setError(editBlocked);
      return;
    }
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
    if (totals.dr === 0 || totals.cr === 0) {
      setError("Please add journal entries to the list!");
      return;
    }
    for (const line of lines) {
      if (!(toNumber(line.amount) > 0)) {
        setError("Please Input Amount! (" + line.title + ")");
        return;
      }
    }
    if (totals.difference !== 0) {
      setError("Debit & Credit Balance is not equal!");
      return;
    }

    const payloadLines = [];
    for (const line of lines) {
      payloadLines.push({ ca_id: line.ca_id, transaction_type: line.transaction_type, amount: line.amount, cost_center_id: line.cost_center_id });
    }

    let payloadChequeId: number | null = null;
    if (hasCheque) {
      payloadChequeId = chequeId;
    }

    const payload: VoucherPayload = {
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
      cheque_id: payloadChequeId,
      lines: payloadLines,
    };

    try {
      setSaving(true);
      if (isEdit) {
        const result = await journalEntryService.updateVoucher(editType, editNo, payload);
        toast.success(result.voucher_no + " successfully updated");
        router.push("/accounting/voucher-manage");
        return;
      }
      const result = await journalEntryService.save(payload);
      toast.success("Successfully Saved: " + result.voucher_no);
      // company, date, currency and type stay for the next voucher
      clearVoucher();
      loadNextNo();
      if (hasCheque) {
        // the used cheque leaves the active list
        loadCheques();
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved. Please solve the above errors!"));
    } finally {
      setSaving(false);
    }
  }

  let rateText = "—";
  let rateClass = "text-gray-800 dark:text-white/90";
  if (rate !== null && rate > 0) {
    rateText = String(rate);
  }
  if (rate === 0) {
    rateText = "No rate for this date";
    rateClass = "text-error-600 dark:text-error-400";
  }

  let saveLabel = "Save " + currentTab.label + " Voucher";
  if (isEdit) {
    saveLabel = "Update " + currentTab.label + " Voucher";
  }
  if (saving) {
    saveLabel = "Saving...";
  }

  let pageTitle = "Voucher Entry";
  let permissions = ["voucher-entry.create"];
  if (isEdit) {
    pageTitle = "Update Voucher " + editVoucherNo;
    permissions = ["voucher-entry.edit"];
  }

  // the Back button shows only for a user who can open Voucher Manage
  const canManage = hasPermission("voucher-entry.view") || hasPermission("voucher-entry.edit") || hasPermission("voucher-entry.delete");

  let voucherNoText = nextNo || "Will Auto Generate";
  if (isEdit) {
    voucherNoText = editVoucherNo;
  }

  const balanced = lines.length > 0 && totals.dr > 0 && totals.difference === 0;
  let differenceClass = "text-error-600 dark:text-error-400";
  if (balanced) {
    differenceClass = "text-success-600 dark:text-success-500";
  }

  const chequeOptions: { value: number; label: string }[] = [];
  for (const cheque of cheques) {
    chequeOptions.push({ value: cheque.id, label: chequeLabel(cheque) });
  }

  // Enter in the amount adds the line
  function entryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addLine();
    }
  }

  return (
    <AccessRoute requiredPermissions={permissions}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: pageTitle }]} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* left: the voucher */}
          <div className="space-y-5">
            <div className={cardClass}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{pageTitle}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currentTab.hint}</p>
                </div>
                {canManage && (
                  <Button type="button" size="sm" variant="outline" startIcon={<FiArrowLeft />} onClick={() => router.push("/accounting/voucher-manage")}>
                    Voucher Manage
                  </Button>
                )}
              </div>

              {editBlocked && (
                <div className="mb-4 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400">{editBlocked}</div>
              )}

              {/* voucher type tabs, only the voucher's own type when updating */}
              <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
                {VOUCHER_TABS.map((tab) => {
                  let tabClass = "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
                  if (tab.id === voucherType) {
                    tabClass = "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-800 dark:text-brand-400";
                  } else if (isEdit) {
                    tabClass = "cursor-not-allowed text-gray-300 dark:text-gray-600";
                  }
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={isEdit && tab.id !== voucherType}
                      onClick={() => changeType(tab.id)}
                      className={"flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition " + tabClass}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* voucher info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label required>Company</Label>
                  <ReactSelect options={companies} value={companyId || null} isClearable={false} placeholder="select" onChange={(value) => setCompanyId(value ? String(value) : "")} />
                </div>
                <div>
                  <Label required>Entry Date</Label>
                  <DatePicker key={"entry-date-" + formKey} id="entry_date" defaultDate={entryDate || undefined} onChange={changeEntryDate} placeholder="Select date" />
                </div>
                <div>
                  <Label required>Currency</Label>
                  <ReactSelect options={currencies} value={currencyId || null} isClearable={false} placeholder="select" isDisabled={lines.length > 0} onChange={(value) => setCurrencyId(value ? String(value) : "")} />
                </div>
              </div>

              {hasCheque && (
                <div key={"cheque-" + formKey} className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cheque</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Label>Cheque (from Cheque Book)</Label>
                      <ReactSelect options={chequeOptions} value={chequeId} placeholder="Search an active cheque" onChange={pickCheque} />
                    </div>
                    <div>
                      <Label>Cheque No</Label>
                      <input type="text" value={chequeNo} maxLength={255} disabled={chequeId !== null} placeholder="Or type it" onChange={(e) => setChequeNo(e.target.value)} className={inputClass} />
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
                </div>
              )}

              {hasBill && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            </div>

            {/* the lines */}
            <div className={cardClass}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Journal Lines</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pick the account, put the amount and press Enter or Add</p>
              </div>

              {/* add a line */}
              <div className="mb-4 rounded-xl border border-dashed border-brand-200 bg-brand-25 p-4 dark:border-brand-500/30 dark:bg-brand-500/[0.04]">
                <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label required>Account Title</Label>
                    <AccountAutocomplete
                      ref={accountRef}
                      value={entryCa}
                      label={entryCaLabel}
                      disabled={entryLocked}
                      onPick={(id, label) => {
                        setEntryCa(id);
                        setEntryCaLabel(label);
                        // the amount is the next thing to type
                        if (id && amountRef.current) {
                          amountRef.current.focus();
                        }
                      }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Cost Center</Label>
                    <ReactSelect options={costCenters} value={entryCenter} placeholder="Optional" onChange={(value) => setEntryCenter(value ? Number(value) : null)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label required>Dr / Cr</Label>
                    <ReactSelect options={DR_CR} value={entrySide} isClearable={false} isSearchable={false} onChange={(value) => setEntrySide(value ? String(value) : String(DEBIT))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label required>Amount</Label>
                    <input ref={amountRef} type="number" value={entryAmount} min={0} step="0.01" placeholder="0.00" onWheel={blurOnWheel} onChange={(e) => setEntryAmount(e.target.value)} onKeyDown={entryKeyDown} className={amountClass} />
                  </div>
                  <div className="md:col-span-1">
                    <Button type="button" size="sm" className="h-10 w-full" onClick={addLine} startIcon={<FiPlus />}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-3 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
                    <tr>
                      <th className="w-10 px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Account Title</th>
                      <th className="w-56 px-3 py-2.5">Cost Center</th>
                      <th className="w-36 px-3 py-2.5 text-right">Dr</th>
                      <th className="w-36 px-3 py-2.5 text-right">Cr</th>
                      <th className="w-12 px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {lines.map((line, index) => {
                      let drValue = "";
                      let crValue = "";
                      if (line.transaction_type === DEBIT) {
                        drValue = line.amount;
                      } else {
                        crValue = line.amount;
                      }
                      return (
                        <tr key={line.ca_id + "-" + line.cost_center_id} className="text-gray-700 dark:text-gray-300">
                          <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90">{line.title}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{line.cost_center}</td>
                          <td className="px-3 py-2">
                            <input type="number" value={drValue} min={0} step="0.01" placeholder="—" onWheel={blurOnWheel} onChange={(e) => changeLineAmount(index, DEBIT, e.target.value)} className={amountClass + " h-9"} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={crValue} min={0} step="0.01" placeholder="—" onWheel={blurOnWheel} onChange={(e) => changeLineAmount(index, CREDIT, e.target.value)} className={amountClass + " h-9"} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" title="Remove" onClick={() => removeLine(index)} className="rounded-md p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10">
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-400">No line added yet.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold text-gray-800 dark:bg-white/[0.03] dark:text-white/90">
                    <tr>
                      <td colSpan={3} className="px-3 py-2.5 text-right">Total</td>
                      <td className="px-3 py-2.5 text-right">{formatMoney(totals.dr)}</td>
                      <td className="px-3 py-2.5 text-right">{formatMoney(totals.cr)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-4">
                <Label>Narration</Label>
                <textarea value={narration} maxLength={512} rows={2} onChange={(e) => setNarration(e.target.value)} className={inputClass + " h-auto py-2"} />
              </div>
            </div>
          </div>

          {/* right: summary and save */}
          <div>
            <div className={cardClass + " space-y-4 xl:sticky xl:top-24"}>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{currentTab.label} Voucher</p>
                <p className="mt-1 font-mono text-xl font-semibold text-gray-800 dark:text-white/90" title="Will Auto Generate on save">{voucherNoText}</p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Conversion Rate</dt>
                  <dd className={rateClass}>{rateText}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Lines</dt>
                  <dd className="text-gray-800 dark:text-white/90">{lines.length}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">Total Dr</dt>
                  <dd className="font-semibold text-gray-800 dark:text-white/90">{formatMoney(totals.dr)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Total Cr</dt>
                  <dd className="font-semibold text-gray-800 dark:text-white/90">{formatMoney(totals.cr)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">Difference</dt>
                  <dd className={"font-semibold " + differenceClass}>{formatMoney(totals.difference)}</dd>
                </div>
              </dl>
              {balanced && (
                <p className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-500">
                  <FiCheckCircle /> Balanced, ready to save
                </p>
              )}
              <div className="space-y-2">
                <Button type="button" className="w-full" onClick={save} disabled={saving || editBlocked !== ""}>
                  {saveLabel}
                </Button>
                {isEdit && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/accounting/voucher-manage")}>
                    Cancel
                  </Button>
                )}
                {!isEdit && (
                  <Button type="button" variant="outline" className="w-full" onClick={clearVoucher}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccessRoute>
  );
}
