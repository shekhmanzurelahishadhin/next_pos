"use client";
// Cheque Book, like parts_bazar accounting/chequeBook:
// a book is added as a range of cheque nos (one row per leaf). An active leaf can be canceled,
// a canceled leaf can be updated, and a whole book with no used or canceled leaf can be deleted
// (its leaves go to the Cheque Book Delete History).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEdit, FiSlash, FiTrash2 } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import { formatDateTime, formatMoney } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import {
  CHEQUE_ACTIVE,
  CHEQUE_CANCELED,
  CHEQUE_STATUS,
  chequeBookService,
  ChequeBookPayload,
  ChequeLeaf,
  USED_TYPES,
  usedTypeName,
} from "@/services/chequeBookService";
import { ChequeStatusBadge } from "./ChequeStatusBadge";

type Option = { value: string; label: string };

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const errorClass =
  "rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400";

const MAX_LEAVES = 1000;

function emptyBook(): ChequeBookPayload {
  return { book_no: "", bank_id: "", branch_name: "", prefix: "", first_number: "", second_number: "" };
}

function onlyDigits(value: string) {
  return /^[0-9]+$/.test(value);
}

// the cheque nos the range will make, numbers get leading zeros up to the longer of the two (like parts_bazar)
function rangePreview(book: ChequeBookPayload) {
  if (!onlyDigits(book.first_number) || !onlyDigits(book.second_number)) {
    return null;
  }
  const first = Number(book.first_number);
  const second = Number(book.second_number);
  let digits = book.first_number.length;
  if (book.second_number.length > digits) {
    digits = book.second_number.length;
  }
  return {
    count: second - first + 1,
    firstNo: book.prefix + String(first).padStart(digits, "0"),
    lastNo: book.prefix + String(second).padStart(digits, "0"),
  };
}

export default function ChequeBookPage() {
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<ChequeLeaf[]>([]);
  const [total, setTotal] = useState(0);
  const [banks, setBanks] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  // add book
  const [addOpen, setAddOpen] = useState(false);
  const [book, setBook] = useState<ChequeBookPayload>(emptyBook());
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);

  // update a canceled leaf
  const [editing, setEditing] = useState<ChequeLeaf | null>(null);
  const [leafForm, setLeafForm] = useState({ book_no: "", bank_id: "", branch_name: "", cheque_no: "" });
  const [editError, setEditError] = useState("");

  // delete a whole book
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBank, setDeleteBank] = useState("");
  const [deleteBookNo, setDeleteBookNo] = useState("");
  const [deleteRemarks, setDeleteRemarks] = useState("");
  const [bankBooks, setBankBooks] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await chequeBookService.getList({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load the cheque books");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Cheque Book | Multibrand POS";
    chequeBookService
      .banks()
      .then((list) => setBanks(list))
      .catch(() => toast.error("Failed to load the banks"));
  }, []);

  // the books of the bank picked in the delete form
  useEffect(() => {
    setDeleteBookNo("");
    if (!deleteBank) {
      setBankBooks([]);
      return;
    }
    chequeBookService
      .books(deleteBank)
      .then((list) => setBankBooks(list))
      .catch(() => setBankBooks([]));
  }, [deleteBank]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  function openAdd() {
    setBook(emptyBook());
    setAddError("");
    setAddOpen(true);
  }

  async function saveBook() {
    setAddError("");
    if (!book.book_no.trim()) {
      setAddError("Book No Can not empty!");
      return;
    }
    if (!book.bank_id) {
      setAddError("Bank Can not empty!");
      return;
    }
    if (!book.prefix.trim()) {
      setAddError("Cheque No Prefix Can not empty!");
      return;
    }
    if (!book.first_number || !book.second_number) {
      setAddError("Cheque No Can not empty!");
      return;
    }
    if (!onlyDigits(book.first_number) || !onlyDigits(book.second_number)) {
      setAddError("Cheque No From and To must be numbers only.");
      return;
    }
    const preview = rangePreview(book);
    if (preview && preview.count < 1) {
      setAddError("Cheque No To can not be less than Cheque No From.");
      return;
    }
    if (preview && preview.count > MAX_LEAVES) {
      setAddError("One cheque book can have at most " + MAX_LEAVES + " leaves.");
      return;
    }

    try {
      setSaving(true);
      const message = await chequeBookService.createBook({ ...book, book_no: book.book_no.trim(), prefix: book.prefix.trim(), branch_name: book.branch_name.trim() });
      toast.success(message);
      setAddOpen(false);
      load();
    } catch (err) {
      setAddError(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(leaf: ChequeLeaf) {
    setEditing(leaf);
    setEditError("");
    setLeafForm({ book_no: leaf.book_no, bank_id: String(leaf.bank_id), branch_name: leaf.branch_name || "", cheque_no: leaf.cheque_no });
  }

  async function saveLeaf() {
    if (!editing) {
      return;
    }
    setEditError("");
    if (!leafForm.book_no.trim()) {
      setEditError("Book No Can not empty!");
      return;
    }
    if (!leafForm.bank_id) {
      setEditError("Bank Can not empty!");
      return;
    }
    if (!leafForm.cheque_no.trim()) {
      setEditError("Cheque No Can not empty!");
      return;
    }
    try {
      setSaving(true);
      await chequeBookService.updateLeaf(editing.id, { ...leafForm, book_no: leafForm.book_no.trim(), cheque_no: leafForm.cheque_no.trim(), branch_name: leafForm.branch_name.trim() });
      toast.success("successfully updated");
      setEditing(null);
      load();
    } catch (err) {
      setEditError(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  const cancelLeaf = useCallback(
    async (leaf: ChequeLeaf) => {
      const result = await confirm({ title: "Cancel Cheque?", text: "Are you sure to cancel this cheque? " + leaf.cheque_no });
      if (!result.isConfirmed) {
        return;
      }
      try {
        await chequeBookService.cancelLeaf(leaf.id);
        toast.success("Cheque " + leaf.cheque_no + " canceled");
        load();
      } catch (err) {
        toast.error(apiErrorMessage(err, "Failed to cancel"));
      }
    },
    [confirm, load]
  );

  function openDelete() {
    setDeleteBank("");
    setDeleteBookNo("");
    setDeleteRemarks("");
    setDeleteError("");
    setDeleteOpen(true);
  }

  async function deleteBook() {
    setDeleteError("");
    if (!deleteBookNo) {
      setDeleteError("Please Insert Book No!");
      return;
    }
    if (!deleteBank) {
      setDeleteError("Please Insert Bank Name!");
      return;
    }
    if (!deleteRemarks.trim()) {
      setDeleteError("Please Insert Remarks!");
      return;
    }
    const result = await confirm({ title: "Delete Cheque Book?", text: "Delete book " + deleteBookNo + "? Its leaves move to the Cheque Book Delete History." });
    if (!result.isConfirmed) {
      return;
    }
    try {
      setSaving(true);
      const message = await chequeBookService.deleteBook(deleteBookNo, deleteBank, deleteRemarks.trim());
      toast.success(message);
      setDeleteOpen(false);
      load();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Cheque book not deleted"));
    } finally {
      setSaving(false);
    }
  }

  const byBook = useCallback((row: ChequeLeaf) => row.bank_id + "-" + row.book_no, []);

  const columns = useMemo<ColumnDef<ChequeLeaf>[]>(
    () => [
      {
        id: "book_no",
        accessorKey: "book_no",
        header: "Book No",
        meta: { filterVariant: "text", mergeBy: byBook, widthClass: "w-[120px]" },
        cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.book_no}</span>,
      },
      {
        id: "bank_id",
        accessorKey: "bank_id",
        header: "Bank",
        meta: { filterVariant: "select", filterOptions: banks, mergeBy: byBook, widthClass: "min-w-[160px]" },
        cell: ({ row }) => {
          if (row.original.bank && row.original.bank.title) {
            return row.original.bank.title;
          }
          return "";
        },
      },
      {
        id: "branch_name",
        accessorKey: "branch_name",
        header: "Branch Name",
        meta: { filterVariant: "text", mergeBy: byBook, widthClass: "w-[140px]" },
        cell: ({ row }) => row.original.branch_name || "",
      },
      {
        id: "cheque_no",
        accessorKey: "cheque_no",
        header: "Cheque No",
        meta: { filterVariant: "text", widthClass: "w-[140px]" },
        cell: ({ row }) => <span className="font-mono">{row.original.cheque_no}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        meta: { filterVariant: "select", filterOptions: CHEQUE_STATUS, widthClass: "w-[120px]" },
        cell: ({ row }) => <ChequeStatusBadge status={row.original.status} />,
      },
      {
        id: "used_date",
        header: "Used Date",
        meta: { filterVariant: "none", widthClass: "w-[150px]" },
        cell: ({ row }) => formatDateTime(row.original.used_date),
      },
      {
        id: "used_type",
        accessorKey: "used_type",
        header: "Used Type",
        meta: { filterVariant: "select", filterOptions: USED_TYPES, widthClass: "w-[150px]" },
        cell: ({ row }) => usedTypeName(row.original.used_type),
      },
      {
        id: "amount",
        header: "Amount",
        meta: { filterVariant: "none", widthClass: "w-[110px]", align: "right" },
        cell: ({ row }) => {
          if (row.original.amount === null) {
            return "";
          }
          return <span className="block text-right">{formatMoney(row.original.amount)}</span>;
        },
      },
      {
        id: "actions",
        header: "Options",
        meta: { filterVariant: "none", widthClass: "w-[80px]" },
        cell: ({ row }) => (
          <ActionButtons
            row={row.original}
            buttons={[
              {
                icon: FiSlash,
                variant: "danger",
                size: "sm",
                tooltip: "Cancel Cheque",
                show: () => row.original.status === CHEQUE_ACTIVE && hasPermission("cheque-book.edit"),
                onClick: () => cancelLeaf(row.original),
              },
              {
                icon: FiEdit,
                variant: "primary",
                size: "sm",
                tooltip: "Update",
                show: () => row.original.status === CHEQUE_CANCELED && hasPermission("cheque-book.edit"),
                onClick: () => openEdit(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [banks, byBook, cancelLeaf, hasPermission]
  );

  const preview = rangePreview(book);
  let previewText = "";
  let previewWarn = false;
  if (preview) {
    if (preview.count < 1) {
      previewText = "Cheque No To can not be less than Cheque No From.";
      previewWarn = true;
    } else if (preview.count > MAX_LEAVES) {
      previewText = preview.count + " leaves, at most " + MAX_LEAVES + " in one book.";
      previewWarn = true;
    } else {
      previewText = preview.count + " leaves: " + preview.firstNo + " to " + preview.lastNo;
    }
  }

  let addLabel = "Add Cheque Book";
  if (saving) {
    addLabel = "Saving...";
  }

  const bookOptions: Option[] = [];
  for (const bookNo of bankBooks) {
    bookOptions.push({ value: bookNo, label: bookNo });
  }

  return (
    <AccessRoute requiredPermissions={["cheque-book.view", "cheque-book.create", "cheque-book.edit", "cheque-book.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Cheque Book" }]} />
        <ComponentCard
          title="Cheque Book"
          desc="Add a book as a range of cheque nos. A voucher or payment uses an ACTIVE leaf and marks it USED."
          showAddButton={hasPermission("cheque-book.create")}
          buttonLabel="Add Cheque Book"
          openModal={openAdd}
          headerAction={
            hasPermission("cheque-book.delete") && (
              <Button type="button" size="sm" variant="outline" startIcon={<FiTrash2 />} onClick={openDelete}>
                Delete Cheque Book
              </Button>
            )
          }
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="cheque-book"
            showExportAllOption={false}
          />
        </ComponentCard>

        {/* add a book */}
        <Modal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          className="max-w-lg"
          title="Add New Cheque Book Info"
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={saveBook} disabled={saving}>{addLabel}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {addError && <div className={errorClass}>{addError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Book No</Label>
                <input type="text" value={book.book_no} maxLength={255} placeholder="e.g. 01" onChange={(e) => setBook({ ...book, book_no: e.target.value })} className={inputClass} />
              </div>
              <div>
                <Label>Branch Name</Label>
                <input type="text" value={book.branch_name} maxLength={255} onChange={(e) => setBook({ ...book, branch_name: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <Label required>Bank</Label>
              <ReactSelect options={banks} value={book.bank_id || null} placeholder="Select" onChange={(value) => setBook({ ...book, bank_id: value ? String(value) : "" })} />
              {banks.length === 0 && (
                <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">No bank yet. Add the bank account as a head under &quot;Cash At Bank&quot; in Chart Of Accounts.</p>
              )}
            </div>
            <div>
              <Label required>Cheque No</Label>
              <div className="grid grid-cols-[1fr_2fr_auto_2fr] items-center gap-2">
                <input type="text" value={book.prefix} maxLength={100} placeholder="Ex: ABC" onChange={(e) => setBook({ ...book, prefix: e.target.value })} className={inputClass} />
                <input type="text" inputMode="numeric" value={book.first_number} maxLength={20} placeholder="Ex: 0001" onChange={(e) => setBook({ ...book, first_number: e.target.value })} className={inputClass} />
                <span className="text-sm text-gray-500">To</span>
                <input type="text" inputMode="numeric" value={book.second_number} maxLength={20} placeholder="Ex: 0100" onChange={(e) => setBook({ ...book, second_number: e.target.value })} className={inputClass} />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Prefix, then the first and the last number of the book.</p>
            </div>
            {previewText && (
              <div className={previewWarn ? errorClass : "rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"}>
                {previewText}
              </div>
            )}
          </div>
        </Modal>

        {/* update a canceled leaf */}
        <Modal
          isOpen={editing !== null}
          onClose={() => setEditing(null)}
          className="max-w-md"
          title="Update Cheque"
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="button" size="sm" onClick={saveLeaf} disabled={saving}>{saving ? "Saving..." : "Update"}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {editError && <div className={errorClass}>{editError}</div>}
            <div>
              <Label required>Book No</Label>
              <input type="text" value={leafForm.book_no} maxLength={255} onChange={(e) => setLeafForm({ ...leafForm, book_no: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label required>Bank</Label>
              <ReactSelect options={banks} value={leafForm.bank_id || null} placeholder="Select" onChange={(value) => setLeafForm({ ...leafForm, bank_id: value ? String(value) : "" })} />
            </div>
            <div>
              <Label>Branch Name</Label>
              <input type="text" value={leafForm.branch_name} maxLength={255} onChange={(e) => setLeafForm({ ...leafForm, branch_name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label required>Cheque No</Label>
              <input type="text" value={leafForm.cheque_no} maxLength={255} placeholder="Ex: ABC0001" onChange={(e) => setLeafForm({ ...leafForm, cheque_no: e.target.value })} className={inputClass} />
            </div>
          </div>
        </Modal>

        {/* delete a whole book */}
        <Modal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          className="max-w-md"
          title="Cheque Book Delete"
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" className="bg-error-500 hover:bg-error-600" onClick={deleteBook} disabled={saving}>{saving ? "Deleting..." : "Delete"}</Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">A book can be deleted only when none of its leaves is used or canceled. The leaves are kept in the Cheque Book Delete History.</p>
            {deleteError && <div className={errorClass}>{deleteError}</div>}
            <div>
              <Label required>Bank Name</Label>
              <ReactSelect options={banks} value={deleteBank || null} placeholder="Select Bank" onChange={(value) => setDeleteBank(value ? String(value) : "")} />
            </div>
            <div>
              <Label required>Book No</Label>
              <ReactSelect options={bookOptions} value={deleteBookNo || null} placeholder={deleteBank ? "Select Book" : "Select the bank first"} isDisabled={!deleteBank} onChange={(value) => setDeleteBookNo(value ? String(value) : "")} />
            </div>
            <div>
              <Label required>Remarks</Label>
              <input type="text" value={deleteRemarks} maxLength={255} onChange={(e) => setDeleteRemarks(e.target.value)} className={inputClass} />
            </div>
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
