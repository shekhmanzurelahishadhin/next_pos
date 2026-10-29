// hooks/useCustomerContacts.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  customerContactService,
  CustomerContact,
  CustomerContactFormData,
  CustomerContactFilters,
  PaginatedResponse,
} from '@/services/customerContactService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';

export const useCustomerContacts = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  // Filter and pagination state
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [total, setTotal] = useState(0);

  // Load contacts
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: CustomerContactFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<CustomerContact> = await customerContactService.getContacts(apiFilters);
      setContacts(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load customer contacts');
      console.error('Error loading customer contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Modal operations
  const handleView = useCallback((contact: CustomerContact) => {
    setSelectedContact(contact);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((contact: CustomerContact) => {
    setSelectedContact(contact);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedContact(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedContact(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this contact to trash?',
    });
    if (!result.isConfirmed) return;

    try {
      await customerContactService.softDeleteContact(id);
      toast.success('Contact moved to trash!');
      await loadContacts();
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  }, [confirm, loadContacts]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Contact?',
      text: 'Are you sure you want to delete this contact permanently? This action cannot be undone.',
    });
    if (!result.isConfirmed) return;

    try {
      await customerContactService.forceDeleteContact(id);
      toast.success('Contact deleted successfully!');
      await loadContacts();
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  }, [confirm, loadContacts]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await customerContactService.restoreContact(id);
      toast.success('Contact restored successfully!');
      await loadContacts();
    } catch (err) {
      toast.error('Failed to restore contact');
    }
  }, [loadContacts]);

  const handleSave = useCallback(async (contactData: CustomerContactFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedContact) {
        await customerContactService.updateContact(selectedContact.id, contactData);
        toast.success('Contact updated successfully!');
      } else {
        await customerContactService.createContact(contactData);
        toast.success('Contact created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadContacts();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : (messages as string);
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save contact');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedContact, loadContacts, handleCloseModal]);

  // Filter and search operations
  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Export all contacts (no pagination)
  const exportAllContacts = async () => {
    const response = await customerContactService.getContacts({});
    return response.data;
  };

  return {
    // State
    contacts,
    loading,
    saving,
    isOpen,
    selectedContact,
    mode,
    backendErrors,
    pagination,
    total,

    // Actions
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
