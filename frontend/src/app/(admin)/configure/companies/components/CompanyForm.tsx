"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Company } from "@/services/companyService";
import { useEffect } from "react";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import FileInput from "@/components/form/input/FileInput";

interface CompanyFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: File | null;
  status?: number;
}

interface CompanyFormProps {
  status: { value: number; label: string }[];
  company?: Company | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (companyData: CompanyFormData | FormData) => void;
  backendErrors?: Record<string, string>;
}

export function CompanyForm({ status, company, mode, saving, onSubmit, backendErrors }: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
    watch,
  } = useForm<CompanyFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "", 
      phone: "", 
      address: "", 
      status: 1,
    }
  });

  // Watch the logo field to conditionally apply validation
  const logoFile = watch('logo');

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof CompanyFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && company) {
      reset({
        name: company?.name ?? '',
        email: company?.email ?? '', 
        phone: company?.phone ?? '', 
        address: company?.address ?? '', 
        status: Number(company?.status ?? 1),
      });
    } else {
      reset({
        name: '',
        email: '', 
        phone: '', 
        address: '', 
        status: 1,
      });
    }
  }, [company, reset, mode]);

  const onFormSubmit = (data: CompanyFormData) => {
    const formData = new FormData();
    
    // Append all form fields to FormData
    formData.append('name', data.name);
    
    if (data.email) formData.append('email', data.email);
    if (data.phone) formData.append('phone', data.phone);
    if (data.address) formData.append('address', data.address);
    if (data.status !== undefined) formData.append('status', data.status.toString());
    
    // Append file if it exists (only for create or if new file selected)
    if (data.logo instanceof File) {
      formData.append('logo', data.logo);
    }
    
    // For update, if no file is selected but we have an existing company,
    // we might want to send a flag to keep the existing logo
    if (mode === 'edit') {
       formData.append("_method", "PUT");
    }
    
    onSubmit(formData);
  };
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/storage/';
  return (
    <form id="company-form" onSubmit={handleSubmit(onFormSubmit)} encType="multipart/form-data">
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" required>Company Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter company name."
            register={register("name", {
              required: "Company name is required",
              minLength: {
                value: 2,
                message: "Company name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Company name must not exceed 50 characters"
              },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter company email."
            register={register("email", {
              minLength: {
                value: 2,
                message: "Company email must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Company email must not exceed 50 characters"
              },
            })}
            error={errors.email?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter company phone."
            register={register("phone", {
              minLength: {
                value: 2,
                message: "Company phone must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Company phone must not exceed 50 characters"
              },
            })}
            error={errors.phone?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Controller
            name="address"
            control={control}
            rules={{
              maxLength: {
                value: 255,
                message: "Max length is 255 characters",
              },
            }}
            render={({ field }) => (
              <TextArea
                id="address"
                placeholder="Enter company address."
                value={field.value || ""}
                onChange={field.onChange}
                error={errors.address?.message}
                disabled={saving}
                rows={3}
              />
            )}
          />
        </div>
        
        <div>
          <Label htmlFor="logo" required={mode === 'create'}>
            Upload file {mode === 'create' ? '' : '(Optional)'}
          </Label>

          <Controller
            name="logo"
            control={control}
            rules={{
              // Logo is required only for create mode
              required: mode === 'create' ? "Logo is required" : false,
              validate: {
                fileSize: (file) => {
                  if (!file) return true; // No file is allowed in edit mode
                  return file.size <= 2 * 1024 * 1024 || "Max file size is 2MB";
                },
                fileType: (file) => {
                  if (!file) return true; // No file is allowed in edit mode
                  return ["image/png", "image/jpeg", "image/jpg"].includes(file.type) ||
                    "Only PNG or JPG images are allowed";
                },
              },
            }}
            render={({ field }) => (
              <div>
                <FileInput
                  id="logo"
                  accept="image/*"
                  disabled={saving}
                  error={errors.logo?.message}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    field.onChange(file);
                  }}
                />
                {/* Show existing logo preview in edit mode */}
                {mode === 'edit' && company?.logo && !logoFile && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Current logo:</p>
                    <div className="relative w-20 h-20 border rounded overflow-hidden">
                      <img 
                        src={baseUrl + company.logo} 
                        alt={`${company.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {/* Show new logo preview */}
                {logoFile && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">New logo preview:</p>
                    <div className="relative w-20 h-20 border rounded overflow-hidden">
                      <img 
                        src={URL.createObjectURL(logoFile)} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
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
              rules={{ required: "Status is required" }}
              render={({ field }) => (
                <div className="relative">
                  <Select
                    options={status}
                    value={field.value?.toString() ?? ""}
                    placeholder="Select Status"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
              )}
            />
            {errors.status?.message && (
              <p className="mt-1.5 text-xs text-error-500">
                {errors.status.message}
              </p>
            )}
          </div>
        )}
      </div>
    </form>
  );
}