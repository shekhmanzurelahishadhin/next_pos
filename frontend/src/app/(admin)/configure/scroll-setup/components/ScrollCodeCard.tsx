"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@/lib/options";
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

  // the saved codes go into the inputs (again after each save)
  useEffect(() => {
    const savedValues: Record<string, string> = {};
    for (const item of items) {
      savedValues[item.key] = item.code;
    }
    setValues(savedValues);
    setErrors({});
  }, [items]);

  // every code is needed, letters and numbers only, and one code only once
  function validate() {
    const found: Record<string, string> = {};
    const usedBy: Record<string, string> = {}; // code => key that has it
    for (const item of items) {
      const code = (values[item.key] ?? "").trim().toUpperCase();
      if (!code) {
        found[item.key] = "Required";
      } else if (!/^[A-Z0-9]+$/.test(code)) {
        found[item.key] = "Letters and numbers only";
      } else if (usedBy[code]) {
        // both items with the same code get the message
        found[item.key] = "Used twice";
        found[usedBy[code]] = "Used twice";
      }
      usedBy[code] = item.key;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function handleSave() {
    if (!validate()) {
      return;
    }
    try {
      setSaving(true);
      onSaved(await scrollCodeService.saveCodes(type, values));
      toast.success(title + " saved successfully!");
    } catch (err) {
      // the server sends the errors as "codes.<key>"
      const error = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      const serverErrors = error.response?.data?.errors ?? {};
      const found: Record<string, string> = {};
      for (const field in serverErrors) {
        found[field.replace("codes.", "")] = serverErrors[field][0];
      }
      setErrors(found);
      if (Object.keys(serverErrors).length === 0) {
        toast.error(apiErrorMessage(err, "Failed to save " + title));
      }
    } finally {
      setSaving(false);
    }
  }

  // codes are kept in capitals and not longer than allowed
  function changeCode(key: string, value: string) {
    setValues((oldValues) => ({ ...oldValues, [key]: value.toUpperCase().slice(0, maxLength) }));
  }

  return (
    <ComponentCard title={title} desc={desc}>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3 py-1.5">
            <span className="w-32 shrink-0 pt-2 text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
            <div className="flex-1">
              <Input
                value={values[item.key] ?? ""}
                onChange={(e) => changeCode(item.key, e.target.value)}
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
