"use client";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { PpSpSetup, PpSpSetupFormData, PP_SP_TYPES, convertPrice } from "@/services/ppSpSetupService";

interface PpSpSetupFormProps {
  status: { value: number; label: string }[];
  setup?: PpSpSetup | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (data: PpSpSetupFormData) => void;
  backendErrors?: Record<string, string>;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const emptyForm: PpSpSetupFormData = { type: "", codes: Array(10).fill("") };

export function PpSpSetupForm({ status, setup, mode, saving, onSubmit, backendErrors }: PpSpSetupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
    watch,
    getValues,
  } = useForm<PpSpSetupFormData>({
    mode: "onChange",
    defaultValues: emptyForm,
  });

  // Handle backend errors (codes come back as "codes.3")
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as any, { type: 'server', message });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && setup) {
      reset({ type: setup.type, codes: [...setup.codes], status: Number(setup.status ?? 1) });
    } else {
      reset(emptyForm);
    }
  }, [setup, reset, mode]);

  const codes = watch("codes");

  return (
    <form id="pp-sp-setup-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="type" required>Type</Label>
            <Controller
              name="type"
              control={control}
              rules={{ required: "Please select a type" }}
              render={({ field, fieldState }) => (
                <Select
                  options={PP_SP_TYPES}
                  value={field.value?.toString() ?? ""}
                  placeholder="Select Type"
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                  error={fieldState.error?.message}
                  disabled={saving}
                />
              )}
            />
          </div>

          {/* Show status field only in edit mode */}
          {mode === "edit" && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    options={status}
                    value={field.value?.toString() ?? ""}
                    placeholder="Select Status"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={saving}
                  />
                )}
              />
            </div>
          )}
        </div>

        <div>
          <Label required>Code for each digit</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {DIGITS.map((digit) => (
              <div key={digit}>
                <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Digit {digit}</span>
                <Input
                  id={`code_${digit}`}
                  type="text"
                  placeholder="Code"
                  register={register(`codes.${digit}` as const, {
                    required: "Required",
                    maxLength: { value: 10, message: "Max 10 characters" },
                    // the same code cannot stand for two digits
                    validate: (value) =>
                      getValues("codes").filter((c, i) => i !== digit && c.trim() !== "" && c.trim() === value.trim()).length === 0
                      || "Used twice",
                  })}
                  error={errors.codes?.[digit]?.message}
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </div>

        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
          Example: price <span className="font-medium text-gray-800 dark:text-white/90">1250</span> will show as{" "}
          <span className="font-medium text-brand-500">{convertPrice("1250", codes) || "—"}</span>
        </p>
      </div>
    </form>
  );
}
