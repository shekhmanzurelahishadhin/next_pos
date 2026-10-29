"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { ScrollCodeItem, ScrollCodes, ScrollCodeType, scrollCodeService } from "@/services/scrollCodeService";

interface ScrollCodeCardProps {
  type: ScrollCodeType;
  title: string;
  desc: string;
  items: ScrollCodeItem[];
  maxLength: number;
  canEdit: boolean;
  onSaved: (codes: ScrollCodes) => void;
}

// One editable list of codes (months, year digits or prefixes) with its own Save button
export function ScrollCodeCard({ type, title, desc, items, maxLength, canEdit, onSaved }: ScrollCodeCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(Object.fromEntries(items.map((item) => [item.key, item.code])));
    setErrors({});
  }, [items]);

  const validate = () => {
    const found: Record<string, string> = {};
    const used: Record<string, string> = {};
    items.forEach(({ key }) => {
      const code = (values[key] ?? "").trim().toUpperCase();
      if (!code) found[key] = "Required";
      else if (!/^[A-Z0-9]+$/.test(code)) found[key] = "Letters and numbers only";
      else if (used[code]) found[key] = found[used[code]] = "Used twice";
      used[code] = key;
    });
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      onSaved(await scrollCodeService.saveCodes(type, values));
      toast.success(`${title} saved successfully!`);
    } catch (err: any) {
      const backend = err?.response?.data?.errors ?? {};
      // backend sends "codes.<key>"
      setErrors(Object.fromEntries(Object.entries(backend).map(([field, msg]) => [field.replace("codes.", ""), (msg as string[])[0]])));
      if (!Object.keys(backend).length) toast.error(err?.response?.data?.message || `Failed to save ${title}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ComponentCard title={title} desc={desc}>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3 py-1.5">
            <span className="w-32 shrink-0 pt-2 text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
            <div className="flex-1">
              <Input
                value={values[item.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [item.key]: e.target.value.toUpperCase().slice(0, maxLength) }))}
                error={errors[item.key]}
                disabled={!canEdit || saving}
                placeholder="Code"
              />
            </div>
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </ComponentCard>
  );
}
