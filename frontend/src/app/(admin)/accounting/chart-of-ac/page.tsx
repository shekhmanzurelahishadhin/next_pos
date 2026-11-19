"use client";
// Chart Of Accounts: the account heads as a tree.
// Works like parts_bazar accounting/chartOfAc create + admin:
//  - a new head goes under a Group Head (no main head, no auto head), the code is the next number
//  - Update CA Info has Manual Code too; an auto head and the 5 main heads can not be updated
//  - ticked heads are deleted together; a system head, an auto head or a head with child heads can not be deleted
import { ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiChevronDown, FiChevronRight, FiEdit, FiPlus, FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import Checkbox from "@/components/form/input/Checkbox";
import { formatDateTime } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { chartOfAcService, ChartOfAc, ChartOfAcPayload } from "@/services/chartOfAcService";

const SYSTEM_HEAD = 1;
const AUTO_HEAD = 1;

const HEAD_TYPES = [
  { value: "0", label: "Manual" },
  { value: "1", label: "Auto" },
];

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function emptyForm(): ChartOfAcPayload {
  return { root: null, code: "", manual_code: "", title: "", head_type: "", dep: "" };
}

// heads of each parent: { parentId: [heads] }
function groupByRoot(accounts: ChartOfAc[]) {
  const children: Record<number, ChartOfAc[]> = {};
  for (const account of accounts) {
    if (!children[account.root]) {
      children[account.root] = [];
    }
    children[account.root].push(account);
  }
  return children;
}

// ids of the head and every head under it
function headAndChildIds(id: number, children: Record<number, ChartOfAc[]>) {
  const ids = [id];
  const list = children[id] || [];
  for (const child of list) {
    const childIds = headAndChildIds(child.id, children);
    for (const childId of childIds) {
      ids.push(childId);
    }
  }
  return ids;
}

export default function ChartOfAcPage() {
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [accounts, setAccounts] = useState<ChartOfAc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mainRoot, setMainRoot] = useState<number | null>(null);
  const [closed, setClosed] = useState<Record<number, boolean>>({}); // heads the user folded
  const [ticked, setTicked] = useState<number[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChartOfAc | null>(null);
  const [form, setForm] = useState<ChartOfAcPayload>(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await chartOfAcService.getAll();
      setAccounts(list);
      setTicked([]);
    } catch {
      toast.error("Failed to load the chart of accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Chart Of Accounts | Multibrand POS";
    load();
  }, [load]);

  const canCreate = hasPermission("chart-of-ac.create");
  const canEdit = hasPermission("chart-of-ac.edit");
  const canDelete = hasPermission("chart-of-ac.delete");

  const children = groupByRoot(accounts);

  const byId: Record<number, ChartOfAc> = {};
  for (const account of accounts) {
    byId[account.id] = account;
  }

  // with a search, show the heads that match and the heads above them
  let visibleIds: Record<number, boolean> | null = null;
  const searchText = search.trim().toLowerCase();
  if (searchText !== "") {
    visibleIds = {};
    for (const account of accounts) {
      const text = (account.title + " " + account.code + " " + (account.manual_code || "")).toLowerCase();
      if (text.includes(searchText)) {
        let check: ChartOfAc | undefined = account;
        while (check) {
          visibleIds[check.id] = true;
          check = byId[check.root];
        }
      }
    }
  }

  const mainRootOptions: { value: number; label: string }[] = [];
  for (const account of children[0] || []) {
    mainRootOptions.push({ value: account.id, label: account.title });
  }

  // ---------- add / update ----------

  async function openAdd(groupHeadId: number | null) {
    setEditing(null);
    setError("");
    const newForm = emptyForm();
    newForm.root = groupHeadId;
    setForm(newForm);
    setModalOpen(true);

    // the next code, like parts_bazar
    try {
      const code = await chartOfAcService.nextCode();
      setForm((old) => ({ ...old, code: code }));
    } catch {
      // the user can still type the code
    }
  }

  function openUpdate(row: ChartOfAc) {
    setEditing(row);
    setError("");
    let dep = "";
    if (row.dep && Number(row.dep) > 0) {
      dep = String(Number(row.dep));
    }
    setForm({
      root: row.root,
      code: row.code,
      manual_code: row.manual_code || "",
      title: row.title,
      head_type: String(row.head_type),
      dep: dep,
    });
    setModalOpen(true);
  }

  function setField(name: keyof ChartOfAcPayload, value: string | number | null) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  async function save() {
    setError("");
    if (!form.root) {
      setError("error! Please select Head Title");
      return;
    }
    if (!form.code.trim()) {
      setError("Code cannot be blank.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title cannot be blank.");
      return;
    }

    const payload = { ...form, code: form.code.trim(), title: form.title.trim() };
    if (!editing) {
      delete payload.manual_code; // like parts_bazar, Manual Code is only on Update
    }

    try {
      setSaving(true);
      if (editing) {
        await chartOfAcService.save(payload, editing.id);
        toast.success("successfully updated");
      } else {
        await chartOfAcService.save(payload);
        toast.success("Data has been saved successfull!");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "error! data not saved"));
    } finally {
      setSaving(false);
    }
  }

  // ---------- delete ----------

  function toggleTick(id: number) {
    if (ticked.includes(id)) {
      setTicked(ticked.filter((tickedId) => tickedId !== id));
    } else {
      setTicked([...ticked, id]);
    }
  }

  async function deleteHeads(ids: number[]) {
    if (ids.length === 0) {
      toast.warning("Please select atleast one Item to delete");
      return;
    }
    let text = "Are you sure you want to delete the Selected items?";
    if (ids.length === 1 && byId[ids[0]]) {
      text = 'Delete "' + byId[ids[0]].title + '"?';
    }
    const result = await confirm({ title: "Delete Account Head?", text: text });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await chartOfAcService.deleteSelected(ids);
      toast.success("Deleted successfully");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete"));
    }
  }

  // ---------- tree ----------

  function toggle(id: number) {
    setClosed((old) => ({ ...old, [id]: !old[id] }));
  }

  function foldAll(fold: boolean) {
    const newClosed: Record<number, boolean> = {};
    if (fold) {
      for (const account of accounts) {
        if (children[account.id]) {
          newClosed[account.id] = true;
        }
      }
    }
    setClosed(newClosed);
  }

  function renderHeads(parentId: number, depth: number): ReactNode {
    const rows: ReactNode[] = [];
    const list = children[parentId] || [];

    for (const account of list) {
      if (visibleIds && !visibleIds[account.id]) {
        continue;
      }
      if (mainRoot && account.root === 0 && account.id !== mainRoot) {
        continue;
      }
      const hasChild = children[account.id] !== undefined;
      const isOpen = visibleIds !== null || !closed[account.id];
      const isMainHead = account.root === 0;
      const isSystem = Number(account.account_type) === SYSTEM_HEAD;
      const isAuto = Number(account.head_type) === AUTO_HEAD;
      const canRemove = canDelete && !isSystem && !isAuto && !hasChild;

      let titleClass = "text-gray-700 dark:text-gray-300";
      if (isMainHead) {
        titleClass = "font-semibold uppercase text-gray-900 dark:text-white";
      } else if (hasChild) {
        titleClass = "font-medium text-gray-800 dark:text-white/90";
      }

      let info = "Created: " + formatDateTime(account.created_at);
      if (account.created_by) {
        info = info + " by " + account.created_by.name;
      }
      if (account.updated_by) {
        info = info + "\nUpdated: " + formatDateTime(account.updated_at) + " by " + account.updated_by.name;
      }

      rows.push(
        <div key={account.id}>
          <div
            className="group flex items-center gap-2 border-b border-gray-100 py-1.5 pr-2 hover:bg-brand-50/40 dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
            style={{ paddingLeft: depth * 22 + 6 }}
            title={info}
          >
            {canDelete && canRemove && (
              <Checkbox checked={ticked.includes(account.id)} onChange={() => toggleTick(account.id)} />
            )}
            {/* same space where the head can not be deleted, so the rows stay in line */}
            {canDelete && !canRemove && <span className="inline-block h-5 w-5" />}
            {hasChild ? (
              <button type="button" onClick={() => toggle(account.id)} className="flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
                {isOpen ? <FiChevronDown /> : <FiChevronRight />}
              </button>
            ) : (
              <span className="inline-block h-5 w-5" />
            )}
            <span className="min-w-[52px] rounded bg-gray-100 px-1.5 py-0.5 text-center font-mono text-[11px] text-gray-600 dark:bg-white/5 dark:text-gray-400">{account.code}</span>
            <span className={`text-sm ${titleClass}`}>{account.title}</span>
            {account.manual_code && <span className="text-xs text-gray-400">[{account.manual_code}]</span>}
            {isSystem && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">System</span>}
            {isAuto && <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-medium text-warning-600 dark:bg-warning-500/15 dark:text-orange-400">Auto</span>}
            {account.dep && Number(account.dep) > 0 && <span className="text-xs text-gray-400">Dep {Number(account.dep)}%</span>}

            <span className="ml-auto flex items-center gap-1 opacity-60 group-hover:opacity-100">
              {canCreate && !isAuto && !isMainHead && (
                <button type="button" title="Add a head under this" onClick={() => openAdd(account.id)} className="rounded p-1 text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10">
                  <FiPlus />
                </button>
              )}
              {canEdit && !isAuto && !isMainHead && (
                <button type="button" title="Update" onClick={() => openUpdate(account)} className="rounded p-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">
                  <FiEdit />
                </button>
              )}
              {canRemove && (
                <button type="button" title="Delete" onClick={() => deleteHeads([account.id])} className="rounded p-1 text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10">
                  <FiTrash />
                </button>
              )}
            </span>
          </div>
          {hasChild && isOpen && renderHeads(account.id, depth + 1)}
        </div>
      );
    }
    return rows;
  }

  // ---------- form lists ----------

  // Group Head, like parts_bazar: manual heads, no main head, ordered by title.
  // On update the head itself and the heads under it are left out.
  let skipIds: number[] = [];
  let editingSystemHead = false;
  if (editing) {
    skipIds = headAndChildIds(editing.id, children);
    editingSystemHead = Number(editing.account_type) === SYSTEM_HEAD;
  }
  const groupHeadOptions: { value: number; label: string }[] = [];
  for (const account of accounts) {
    if (skipIds.includes(account.id)) {
      continue;
    }
    let showIt = account.root !== 0 && Number(account.head_type) !== AUTO_HEAD;
    // a system head under a main head keeps showing its Group Head
    if (editing && account.id === editing.root) {
      showIt = true;
    }
    if (showIt) {
      groupHeadOptions.push({ value: account.id, label: account.title + " (" + account.code + ")" });
    }
  }
  groupHeadOptions.sort((first, second) => first.label.localeCompare(second.label));

  let saveLabel = "Add";
  if (saving) {
    saveLabel = "Saving...";
  } else if (editing) {
    saveLabel = "Update";
  }

  let modalTitle = "Add New CA";
  if (editing) {
    modalTitle = "Update CA Info";
  }

  return (
    <AccessRoute requiredPermissions={["chart-of-ac.view", "chart-of-ac.create", "chart-of-ac.edit", "chart-of-ac.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Chart Of Accounts" }]} />
        <ComponentCard
          title="Chart Of Accounts"
          desc="New heads go under a Group Head. The 5 main heads are fixed, System heads are used by the software and can not be deleted."
          showAddButton={canCreate}
          buttonLabel="Add New CA"
          openModal={() => openAdd(null)}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              placeholder="Search title or code"
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
            <div className="w-48">
              <ReactSelect
                options={mainRootOptions}
                value={mainRoot}
                placeholder="All Main Root"
                onChange={(value) => setMainRoot(value ? Number(value) : null)}
              />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => foldAll(false)}>Expand All</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => foldAll(true)}>Collapse All</Button>
            {canDelete && (
              <Button type="button" size="sm" variant="outline" onClick={() => deleteHeads(ticked)} disabled={ticked.length === 0}>
                <FiTrash /> Delete Selected{ticked.length > 0 ? " (" + ticked.length + ")" : ""}
              </Button>
            )}
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{accounts.length} heads</span>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800">
            {loading && <div className="px-4 py-10 text-center text-sm text-gray-500">Loading...</div>}
            {!loading && accounts.length === 0 && <div className="px-4 py-10 text-center text-sm text-gray-500">No account head found!</div>}
            {!loading && visibleIds !== null && Object.keys(visibleIds).length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-gray-500">No account head matches the search.</div>
            )}
            {!loading && renderHeads(0, 0)}
          </div>
        </ComponentCard>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          className="max-w-lg"
          title={modalTitle}
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>{saveLabel}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
            )}
            <div>
              <Label required>Group Head</Label>
              <ReactSelect
                options={groupHeadOptions}
                value={form.root}
                placeholder="Select"
                isDisabled={editingSystemHead}
                onChange={(value) => setField("root", value ? Number(value) : null)}
              />
              {editingSystemHead && <p className="mt-1 text-xs text-gray-500">The Group Head of a system head can not be changed.</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label required>Code</Label>
                <input type="text" value={form.code} maxLength={255} onChange={(e) => setField("code", e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <Label required>Title</Label>
                <input type="text" value={form.title} maxLength={255} onChange={(e) => setField("title", e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className={editing ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
              {editing && (
                <div>
                  <Label>Manual Code</Label>
                  <input type="text" value={form.manual_code || ""} maxLength={255} onChange={(e) => setField("manual_code", e.target.value)} className={inputClass} />
                </div>
              )}
              <div>
                <Label>Depreciation(%)</Label>
                <input type="number" value={form.dep} min={0} max={100} step="0.01" onChange={(e) => setField("dep", e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label>Head Type</Label>
                <ReactSelect
                  options={HEAD_TYPES}
                  value={form.head_type || null}
                  placeholder="Select"
                  onChange={(value) => setField("head_type", value ? String(value) : "")}
                />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
