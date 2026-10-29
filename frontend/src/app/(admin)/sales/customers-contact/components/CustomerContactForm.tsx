"use client";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { CustomerContact, CustomerContactFormData } from "@/services/customerContactService";

interface CustomerContactFormProps {
  contact?: CustomerContact | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (contactData: CustomerContactFormData) => void;
  backendErrors?: Record<string, string>;
}

const emptyForm: CustomerContactFormData = {
  district: "",
  customer_name: "",
  contact_one: "",
  contact_two: "",
  contact_three: "",
  remarks: "",
};

const phoneRules = { maxLength: { value: 20, message: "Must not exceed 20 characters" } };

export function CustomerContactForm({ contact, mode, saving, onSubmit, backendErrors }: CustomerContactFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<CustomerContactFormData>({
    mode: "onChange",
    defaultValues: emptyForm,
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof CustomerContactFormData, { type: 'server', message });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && contact) {
      reset({
        district: contact.district ?? "",
        customer_name: contact.customer_name ?? "",
        contact_one: contact.contact_one ?? "",
        contact_two: contact.contact_two ?? "",
        contact_three: contact.contact_three ?? "",
        remarks: contact.remarks ?? "",
      });
    } else {
      reset(emptyForm);
    }
  }, [contact, reset, mode]);

  return (
    <form id="customer-contact-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="customer_name" required>Name</Label>
          <Input
            id="customer_name"
            type="text"
            placeholder="Customer or shop name"
            register={register("customer_name", {
              required: "Name is required",
              maxLength: { value: 255, message: "Name must not exceed 255 characters" },
            })}
            error={errors.customer_name?.message}
            disabled={saving}
          />
        </div>

        <div>
          <Label htmlFor="district" required>District</Label>
          <Input
            id="district"
            type="text"
            placeholder="e.g. Dhaka"
            register={register("district", { required: "District is required" })}
            error={errors.district?.message}
            disabled={saving}
          />
        </div>

        {/* three numbers side by side */}
        <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-3">
          <div>
            <Label htmlFor="contact_one" required>Contact One</Label>
            <Input
              id="contact_one"
              type="tel"
              placeholder="e.g. 01711000000"
              register={register("contact_one", { required: "At least one contact number is required", ...phoneRules })}
              error={errors.contact_one?.message}
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="contact_two">Contact Two</Label>
            <Input
              id="contact_two"
              type="tel"
              placeholder="Optional"
              register={register("contact_two", phoneRules)}
              error={errors.contact_two?.message}
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="contact_three">Contact Three</Label>
            <Input
              id="contact_three"
              type="tel"
              placeholder="Optional"
              register={register("contact_three", phoneRules)}
              error={errors.contact_three?.message}
              disabled={saving}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Controller
            name="remarks"
            control={control}
            render={({ field }) => (
              <TextArea
                id="remarks"
                placeholder="Any note about this contact"
                value={field.value || ""}
                onChange={field.onChange}
                error={errors.remarks?.message}
                disabled={saving}
                rows={2}
              />
            )}
          />
        </div>
      </div>
    </form>
  );
}
