"use client";
import React from "react";
import { useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import { 
  FiArrowLeft, 
  FiCheck, 
  FiCheckCircle, 
  FiFilter, 
  FiMenu, 
  FiFolder,
  FiBox,
  FiShield
} from "react-icons/fi";
import { FaCheckSquare } from "react-icons/fa";

import { useUserPermissions } from "@/app/(admin)/users/hooks/useUserPermission";
import Checkbox from "@/components/form/input/Checkbox";
import ReactSelect from "@/components/form/ReactSelect";
import Badge from "@/components/ui/badge/Badge";
import ComponentCard from "@/components/common/ComponentCard";
import AccessRoute from "@/routes/AccessRoute";
import UserPermissionsSkeleton from "@/components/ui/skeleton/RolePermissionsSkeleton";

const UserPermissionsPage = () => {
  const { userId } = useParams();
  const {
    user,
    loading,
    saving,
    selectedPermissions,
    filteredPermissions,
    
    selectedModule,
    selectedMenu,
    selectedSubMenu,
    moduleOptions,
    menuOptions,
    subMenuOptions,
    
    setSelectedModule,
    setSelectedMenu,
    setSelectedSubMenu,
    togglePermission,
    selectAllFiltered,
    deselectAllFiltered,
    selectAllPermissions,
    deselectAllPermissions,
    areAllFilteredSelected,
    handleSave,
    router,
  } = useUserPermissions(userId as string);

  const breadcrumbItems = [
    { title: "Users", href: "/users" },
    { title: "Assign Permissions", href: "#" },
  ];

  if (loading) {
    return <UserPermissionsSkeleton />;
  }

  return (
    <AccessRoute requiredPermissions={["user.assign-permissions"]}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <PageBreadcrumb items={breadcrumbItems} />

        {/* Header Card */}
        <ComponentCard 
          title={`Assign Permissions to ${user?.name || 'User'}`}
          desc="Manage and assign direct permissions to this user"
          className="border-t-4 border-t-blue-500"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FiShield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assign Direct Permissions
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage direct permissions for <span className="font-medium text-blue-600 dark:text-blue-400">{user?.name}</span> ({user?.email})
              </p>
              <div className="mt-2 rounded text-xs text-orange-700 dark:text-orange-400">
                ⚠️ Note: Direct permissions will override role-based permissions
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={selectAllPermissions}
                size="sm"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                onClick={deselectAllPermissions}
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                Deselect All
              </Button>
              <Link href="/users">
                <Button
                  variant="outline"
                  endIcon={<FiArrowLeft />}
                  size="sm"
                >
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </ComponentCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filter Section */}
          <div className="lg:col-span-1">
            <ComponentCard 
              title="Filter Permissions"
              className="h-fit"
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <FiBox className="h-4 w-4 text-gray-500" />
                      Module
                    </div>
                  </label>
                  <ReactSelect
                    value={selectedModule}
                    onChange={(value: string | number | null) => setSelectedModule(value === null ? "" : String(value))}
                    options={moduleOptions.map(module => ({
                      value: module,
                      label: module
                    }))}
                    placeholder="Select Module"
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <FiMenu className="h-4 w-4 text-gray-500" />
                      Menu
                    </div>
                  </label>
                  <ReactSelect
                    value={selectedMenu}
                    onChange={(value: string | number | null) => setSelectedMenu(value === null ? "" : String(value))}
                    options={menuOptions.map(menu => ({
                      value: menu,
                      label: menu
                    }))}
                    placeholder="Select Menu"
                    isDisabled={!selectedModule}
                    isClearable
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <FiFolder className="h-4 w-4 text-gray-500" />
                      Sub Menu
                    </div>
                  </label>
                  <ReactSelect
                    value={selectedSubMenu}
                    onChange={(value: string | number | null) => setSelectedSubMenu(value === null ? "" : String(value))}
                    options={[
                      { value: "", label: "All Submenus" },
                      ...subMenuOptions.map(submenu => ({
                        value: submenu,
                        label: submenu === "Default" ? "General" : submenu,
                      }))
                    ]}
                    placeholder="Select Submenu"
                    isDisabled={!selectedMenu}
                    isClearable
                  />
                </div>

                {/* Filter Stats */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      <div className="flex items-center gap-2">
                        <FiFilter className="h-4 w-4" />
                        Filtered Permissions
                      </div>
                    </span>
                    <Badge color="primary" size="md">
                      {filteredPermissions.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      onClick={selectAllFiltered}
                      size="sm"
                      disabled={filteredPermissions.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={deselectAllFiltered}
                      size="sm"
                      disabled={filteredPermissions.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-blue-100 dark:border-blue-800/50">
                    <Checkbox
                      checked={areAllFilteredSelected()}
                      onChange={() => areAllFilteredSelected() ? deselectAllFiltered() : selectAllFiltered()}
                      label={
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {areAllFilteredSelected() ? "All selected" : "Not all selected"}
                        </span>
                      }
                      disabled={filteredPermissions.length === 0}
                    />
                  </div>
                </div>
              </div>
            </ComponentCard>
          </div>

          {/* Permissions List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Available Permissions Card */}
            <ComponentCard title="Available Permissions">
              <div className="flex items-center gap-2 mb-4">
                <FaCheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  Available Permissions
                </h3>
                {filteredPermissions.length > 0 && (
                  <Badge color="primary" size="sm">
                    {filteredPermissions.length} items
                  </Badge>
                )}
              </div>

              {filteredPermissions.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-gray-300 dark:text-gray-600 text-4xl mb-3">
                    <FiFilter className="h-16 w-16 mx-auto opacity-50" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    No permissions match your selection
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                    Try adjusting your filters or select a different module
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredPermissions.map(perm => (
                    <div
                      key={perm.name}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedPermissions.includes(perm.name)
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm"
                          : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => togglePermission(perm.name)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Checkbox
                            checked={selectedPermissions.includes(perm.name)}
                            onChange={() => togglePermission(perm.name)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            {perm.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ComponentCard>

            {/* Selected Permissions Card */}
            <ComponentCard title="Selected Permissions">
              <div className="flex items-center gap-2 mb-4">
                <FiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  Selected Permissions
                </h3>
                <Badge color="success" size="sm">
                  {selectedPermissions.length} items
                </Badge>
              </div>

              {selectedPermissions.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                  <div className="text-gray-300 dark:text-gray-600 text-4xl mb-3">
                    <FiCheckCircle className="h-16 w-16 mx-auto opacity-30" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    No permissions selected yet
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                    Select permissions using the checkboxes above
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
                  {selectedPermissions.map(permName => {        
                    return (
                      <div
                        key={permName}
                        className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg group hover:border-green-300 dark:hover:border-green-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-green-600 dark:text-green-400">
                            <FiCheck className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {permName}
                              </p>
                              <button
                                onClick={() => togglePermission(permName)}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-6">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={!saving ? <FiCheck className="h-4 w-4" /> : undefined}
                  size="md"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </ComponentCard>
          </div>
        </div>
      </div>
    </AccessRoute>
  );
};

export default UserPermissionsPage;