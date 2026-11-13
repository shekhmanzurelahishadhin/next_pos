// Customer phone book: the contact list, its filters and the add / edit / view modal
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { customerContactService, CustomerContact, CustomerContactFormData } from "@/services/customerContactService";

export const useCustomerContacts = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerContactService.getContacts({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setContacts(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load customer contacts");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleView = useCallback((contact: CustomerContact) => {
    setSelectedContact(contact);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((contact: CustomerContact) => {
    setSelectedContact(contact);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedContact(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedContact(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this contact to trash?",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await customerContactService.softDeleteContact(id);
      toast.success("Contact moved to trash!");
      await loadContacts();
    } catch {
      toast.error("Failed to delete contact");
    }
  }, [confirm, loadContacts]);

  // delete for ever (only a contact in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Contact?",
      text: "Are you sure you want to delete this contact permanently? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await customerContactService.forceDeleteContact(id);
      toast.success("Contact deleted successfully!");
      await loadContacts();
    } catch {
      toast.error("Failed to delete contact");
    }
  }, [confirm, loadContacts]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await customerContactService.restoreContact(id);
      toast.success("Contact restored successfully!");
      await loadContacts();
    } catch {
      toast.error("Failed to restore contact");
    }
  }, [loadContacts]);

  const handleSave = useCallback(async (contactData: CustomerContactFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedContact) {
        await customerContactService.updateContact(selectedContact.id, contactData);
        toast.success("Contact updated successfully!");
      } else {
        await customerContactService.createContact(contactData);
        toast.success("Contact created successfully!");
        // a new contact is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadContacts();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save contact"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedContact, loadContacts, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all contacts for the export, without paging
  async function exportAllContacts() {
    const response = await customerContactService.getContacts({});
    return response.data;
  }

  return {
    contacts,
    loading,
    saving,
    isOpen,
    selectedContact,
    mode,
    backendErrors,
    pagination,
    total,

    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleSoftDelete,
    handleForceDelete,
    handleRestore,
    handleSave,
    handleFilterChange,
    exportAllContacts,
    formatDate,
  };
};
