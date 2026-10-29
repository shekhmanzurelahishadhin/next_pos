"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { PermissionForm } from "./PermissionForm";
import { PermissionDetailView } from "./PermissionDetailView";
import { Permission } from "@/services/permissionService";
interface PermissionFormData {
  name: string;
  module_id: number | null;
  menu_id: number | null;
  sub_menu_id: number | null;
}
interface PermissionModalProps {
  isOpen: boolean;
  permission: Permission | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (permissionData: PermissionFormData) => void;
  backendErrors?: Record<string, string>;

  modules: { value: number; label: string }[];
  menus: { value: number; label: string }[];
  submenus: { value: number; label: string }[];
  loadingModules: boolean;
  loadingMenus: boolean;
  loadingSubmenus: boolean; 
  fetchMenus: (moduleId: number | null) => void;
  fetchSubmenus: (menuId: number | null) => void;
}

export function PermissionModal({
  isOpen,
  permission,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors, 

  modules,
  menus,
  submenus, 
  loadingModules,
  loadingMenus,
  loadingSubmenus,
  fetchMenus,
  fetchSubmenus
}: PermissionModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Permission Details';
      case 'edit': return 'Edit Permission';
      case 'create': return 'Add New Permission';
      default: return 'Permission';
    }
  };

  const getModalSize = () => {
    return mode === 'view' ? 'max-w-2xl' : 'max-w-md';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={getModalSize()}
      title={getTitle()}
      footer={
      <>
        {mode === 'view' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="permission-form"
              size="sm"
              disabled={saving}
            >
              {saving ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Create')}
            </Button>
          </>
        )}
      </>
      }
    >
      <div>
        {mode === 'view' && permission && (
          <PermissionDetailView permission={permission} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <PermissionForm
            permission={mode === 'edit' ? permission : null}
            mode={mode}
            saving={saving}
            onSubmit={onSave}
            backendErrors={backendErrors} // backend errors to form

            modules={modules}
            menus={menus}
            submenus={submenus} 
            loadingModules={loadingModules}
            loadingMenus={loadingMenus}
            loadingSubmenus={loadingSubmenus}
            fetchMenus={fetchMenus}
            fetchSubmenus={fetchSubmenus}
          />
        )}
      </div>
    </Modal>
  );
}