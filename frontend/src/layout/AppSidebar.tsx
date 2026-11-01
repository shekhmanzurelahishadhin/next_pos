"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  FiChevronDown,
  FiSettings,
  FiGrid,
  HorizontaLDots,
  FiUser,
  FiShoppingCart,
  FiShoppingBag,
  FiSearch,
} from "../icons/index";
import { FiBox } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

// Types
type SubSubItem = {
  name: string;
  path: string;
  new?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

type SubItem = {
  name: string;
  path?: string;
  new?: boolean;
  subSubItems?: SubSubItem[];
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

const navItems: NavItem[] = [
  {
    icon: <FiGrid />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <FiUser />,
    name: "User Roles",
    subItems: [
      { name: "Roles", path: "/authorization/roles", requiredPermissions: ["role.view", "role.create", "role.edit", "role.delete"] },
      { name: "Permissions", path: "/authorization/permissions", requiredPermissions: ["permission.view", "permission.create", "permission.edit", "permission.delete"] },
      { name: "Users", path: "/users", requiredPermissions: ["user.view", "user.create", "user.edit", "user.delete"] },
    ],
  },
  {
    icon: <FiSettings />,
    name: "Soft Configure",
    subItems: [
      { name: "Company", path: "/configure/companies", requiredPermissions: ["company.view", "company.create", "company.edit", "company.delete"] },
      { name: "Category", path: "/configure/categories", requiredPermissions: ["category.view", "category.create", "category.edit", "category.delete"] },
      { name: "Sub-Category", path: "/configure/sub-categories", requiredPermissions: ["sub-category.view", "sub-category.create", "sub-category.edit", "sub-category.delete"] },
      { name: "Units", path: "/configure/units", requiredPermissions: ["unit.view", "unit.create", "unit.edit", "unit.delete"] },
      { name: "Brands", path: "/configure/brands", requiredPermissions: ["brand.view", "brand.create", "brand.edit", "brand.delete"] },
      { name: "Products", path: "/configure/products", requiredPermissions: ["product.view", "product.create", "product.edit", "product.delete"] },
      { name: "Lookups", path: "/configure/lookups", requiredPermissions: ["lookup.view", "lookup.create", "lookup.edit", "lookup.delete"] },
      { name: "Stores", path: "/configure/stores", requiredPermissions: ["store.view", "store.create", "store.edit", "store.delete"] },
      { name: "Store Location", path: "/configure/locations", requiredPermissions: ["location.view", "location.create", "location.edit", "location.delete"] },
      { name: "PP/SP Setup", path: "/configure/pp-sp-setup", requiredPermissions: ["pp-sp-setup.view", "pp-sp-setup.create", "pp-sp-setup.edit", "pp-sp-setup.delete"] },
      { name: "Scroll Number Setup", path: "/configure/scroll-setup", requiredPermissions: ["scroll-setup.view", "scroll-setup.edit"] },
      { name: "Purchase Price", path: "/configure/purchase-price", requiredPermissions: ["purchase-price.view", "purchase-price.create"] },
      { name: "Sale Price", path: "/configure/sale-price", requiredPermissions: ["sell-price.view", "sell-price.create"] },
    ],
  },
  {
    name: "Purchases",
    icon: <FiShoppingCart />,
    subItems: [
      { name: "Suppliers", path: "/purchases/suppliers", requiredPermissions: ["supplier.view", "supplier.create", "supplier.edit", "supplier.delete"] },
      { name: "Purchase", path: "/purchases/purchase", requiredPermissions: ["purchase.create"] },
      { name: "Purchase Manage", path: "/purchases/manage", requiredPermissions: ["purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.approve"] },
      { name: "Purchase Return", path: "/purchases/return", requiredPermissions: ["purchase-return.create"] },
      { name: "Purchase Return Manage", path: "/purchases/return-manage", requiredPermissions: ["purchase-return.view", "purchase-return.create", "purchase-return.delete"] },
      { name: "Supplier Payment", path: "/purchases/supplier-payment", requiredPermissions: ["supplier-payment.create"] },
      { name: "Supplier Payment Manage", path: "/purchases/supplier-payment-manage", requiredPermissions: ["supplier-payment.view", "supplier-payment.create", "supplier-payment.delete"] },
    ],
  },
  {
    name: "Inventory",
    icon: <FiBox />,
    subItems: [
      { name: "Inventory Stock", path: "/inventory/stock", requiredPermissions: ["inventory-stock.view"] },
      { name: "Inventory Barcode", path: "/inventory/barcode", requiredPermissions: ["inventory-barcode.view"] },
    ],
  },
  {
    name: "Sales",
    icon: <FiShoppingBag />,
    subItems: [
      { name: "Customers", path: "/sales/customers", requiredPermissions: ["customer.view", "customer.create", "customer.edit", "customer.delete"] },
      { name: "Sales", path: "/sales/sale", requiredPermissions: ["sale.create"] },
      { name: "Sales Manage", path: "/sales/manage", requiredPermissions: ["sale.view", "sale.create", "sale.edit", "sale.delete", "sale.approve"] },
      { name: "Sales Return", path: "/sales/return", requiredPermissions: ["sale-return.create"] },
      { name: "Sales Return Manage", path: "/sales/return-manage", requiredPermissions: ["sale-return.view", "sale-return.create", "sale-return.delete"] },
      { name: "Money Receipt", path: "/sales/money-receipt", requiredPermissions: ["money-receipt.create"] },
      { name: "Money Receipt Manage", path: "/sales/money-receipt-manage", requiredPermissions: ["money-receipt.view", "money-receipt.create", "money-receipt.delete"] },
      { name: "Customers Contact", path: "/sales/customers-contact", requiredPermissions: ["customer-contact.view", "customer-contact.create", "customer-contact.edit", "customer-contact.delete"] },
    ],
  },
];

// Template demo pages (charts, UI elements, forms, ...) are kept out of the ERP menu.
// Their routes still exist; add items here if a section is needed again.
const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { loading, hasRole, hasPermission } = useAuth();
  const [search, setSearch] = useState("");

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [openSubSubmenu, setOpenSubSubmenu] = useState<{
    type: "main" | "others";
    parentIndex: number;
    subIndex: number;
  } | null>(null);

  // DYNAMIC isActive function that handles all parent-child relationships
  const isActive = useCallback((menuPath?: string): boolean => {
    if (!menuPath || menuPath === "#") return false;
    
    // Exact match
    if (pathname === menuPath) return true;
    
    // If menuPath is a parent route, check if current path starts with it
    if (pathname.startsWith(menuPath + "/")) {
      return true;
    }
    
    // Special handling for root paths that are not exact matches
    if (menuPath === "/") {
      return pathname === "/" || pathname.startsWith("/categories") || pathname.startsWith("/line-chart");
    }
    
    return false;
  }, [pathname]);

  // Helper function to check if user has access to menu item
  const hasAccess = useCallback((item: {
    requiredRoles?: string[];
    requiredPermissions?: string[];
  }) => {
    // If no restrictions, allow access
    if (!item.requiredRoles && !item.requiredPermissions) {
      return true;
    }

    // Check roles
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      const hasRequiredRole = item.requiredRoles.some(role => hasRole(role));
      if (!hasRequiredRole) return false;
    }

    // Check permissions
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasRequiredPermission = item.requiredPermissions.some(permission =>
        hasPermission(permission)
      );
      if (!hasRequiredPermission) return false;
    }

    return true;
  }, [hasRole, hasPermission]);

  // Fixed recursive filtering function
  const filterNavItemsRecursive = useCallback((items: NavItem[]): NavItem[] => {
    return items
      .map(item => {
        // Check if item itself has access
        if (!hasAccess(item)) {
          return null;
        }

        let filteredSubItems: SubItem[] = [];

        // Process subItems if they exist
        if (item.subItems) {
          filteredSubItems = item.subItems
            .map(subItem => {
              // Check if subItem itself has access
              if (!hasAccess(subItem)) {
                return null;
              }

              let filteredSubSubItems: SubSubItem[] = [];

              // Process subSubItems if they exist
              if (subItem.subSubItems) {
                filteredSubSubItems = subItem.subSubItems.filter(
                  subSubItem => hasAccess(subSubItem)
                );
              }

              // FIXED LOGIC: Keep subItem only if:
              // 1. It has its own path AND no subSubItems (direct link), OR
              // 2. It has visible subSubItems (has children to show)
              const shouldKeepSubItem =
                (subItem.path && (!subItem.subSubItems || subItem.subSubItems.length === 0)) || // Direct link with no children
                (filteredSubSubItems.length > 0); // Has visible children

              if (shouldKeepSubItem) {
                return {
                  ...subItem,
                  ...(subItem.subSubItems && { subSubItems: filteredSubSubItems })
                };
              }

              // Otherwise, filter out this subItem
              return null;
            })
            .filter(Boolean) as SubItem[];
        }

        // Keep item if:
        // 1. It has its own path, OR
        // 2. It has visible subItems
        const shouldKeepItem = item.path || filteredSubItems.length > 0;

        return shouldKeepItem ? {
          ...item,
          ...(item.subItems && { subItems: filteredSubItems })
        } : null;
      })
      .filter(Boolean) as NavItem[];
  }, [hasAccess]);

  // Filtered navigation items
  const filteredNavItems = useMemo(() => filterNavItemsRecursive(navItems), [filterNavItemsRecursive]);
  const filteredOthersItems = useMemo(() => filterNavItemsRecursive(othersItems), [filterNavItemsRecursive]);

  // Menu search: every link the user can open, matched by its name or its parent's name
  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const links: { name: string; parent?: string; path: string }[] = [];
    [...filteredNavItems, ...filteredOthersItems].forEach((nav) => {
      if (nav.path) links.push({ name: nav.name, path: nav.path });
      nav.subItems?.forEach((sub) => {
        if (sub.path && !sub.subSubItems?.length) links.push({ name: sub.name, parent: nav.name, path: sub.path });
        sub.subSubItems?.forEach((subSub) => links.push({ name: subSub.name, parent: sub.name, path: subSub.path }));
      });
    });
    return links.filter((link) => `${link.name} ${link.parent ?? ""}`.toLowerCase().includes(term));
  }, [search, filteredNavItems, filteredOthersItems]);

  // Clear the search after moving to another page
  useEffect(() => {
    setSearch("");
  }, [pathname]);

  // DYNAMIC function to find active menu item in the hierarchy
  const findActiveMenuPath = useCallback((): { 
    type: "main" | "others"; 
    parentIndex: number; 
    subIndex?: number; 
    subSubIndex?: number 
  } | null => {
    let result: { type: "main" | "others"; parentIndex: number; subIndex?: number; subSubIndex?: number } | null = null;

    // Check all menu items
    const checkItems = (items: NavItem[], type: "main" | "others") => {
      for (let parentIndex = 0; parentIndex < items.length; parentIndex++) {
        const item = items[parentIndex];
        
        // Check main item
        if (item.path && isActive(item.path)) {
          return { type, parentIndex };
        }

        // Check subItems
        if (item.subItems) {
          for (let subIndex = 0; subIndex < item.subItems.length; subIndex++) {
            const subItem = item.subItems[subIndex];
            
            if (subItem.path && isActive(subItem.path)) {
              return { type, parentIndex, subIndex };
            }

            // Check subSubItems
            if (subItem.subSubItems) {
              for (let subSubIndex = 0; subSubIndex < subItem.subSubItems.length; subSubIndex++) {
                const subSubItem = subItem.subSubItems[subSubIndex];
                
                if (isActive(subSubItem.path)) {
                  return { type, parentIndex, subIndex, subSubIndex };
                }
              }
            }
          }
        }
      }
      return null;
    };

    // Check main nav items first
    result = checkItems(filteredNavItems, "main");
    
    // If not found in main, check others
    if (!result) {
      result = checkItems(filteredOthersItems, "others");
    }

    return result;
  }, [filteredNavItems, filteredOthersItems, isActive]);

  // Set initial active menu based on current path
  useEffect(() => {
    if (loading) return; // Wait for auth to load

    const activeMenu = findActiveMenuPath();

    if (activeMenu) {
      setOpenSubmenu({
        type: activeMenu.type,
        index: activeMenu.parentIndex,
      });

      if (activeMenu.subIndex !== undefined) {
        setOpenSubSubmenu({
          type: activeMenu.type,
          parentIndex: activeMenu.parentIndex,
          subIndex: activeMenu.subIndex,
        });
      } else {
        setOpenSubSubmenu(null);
      }
    } else {
      setOpenSubmenu(null);
      setOpenSubSubmenu(null);
    }
  }, [pathname, loading, findActiveMenuPath]);

  // Handlers for submenu toggles
  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
    setOpenSubSubmenu(null);
  };

  // Handler for sub-submenu toggles
  const handleSubSubmenuToggle = (
    parentIndex: number,
    subIndex: number,
    menuType: "main" | "others"
  ) => {
    setOpenSubSubmenu((prevOpenSubSubmenu) => {
      if (
        prevOpenSubSubmenu &&
        prevOpenSubSubmenu.type === menuType &&
        prevOpenSubSubmenu.parentIndex === parentIndex &&
        prevOpenSubSubmenu.subIndex === subIndex
      ) {
        return null;
      }
      return { type: menuType, parentIndex, subIndex };
    });
  };

  // Render menu items
  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-0.5">
      {navItems.map((nav, index) => {
        const isMainItemActive = nav.path ? isActive(nav.path) : false;
        const isSubmenuOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
        
        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group  ${isSubmenuOpen
                    ? "menu-item-active"
                    : "menu-item-inactive"
                  } cursor-pointer ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                  }`}
              >
                <span
                  className={` ${isSubmenuOpen
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <FiChevronDown
                    size={14}
                    className={`ml-auto shrink-0 transition-transform duration-200  ${isSubmenuOpen
                        ? "rotate-180 text-brand-500"
                        : "text-gray-400"
                      }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${isMainItemActive ? "menu-item-active" : "menu-item-inactive"
                    }`}
                >
                  <span
                    className={`${isMainItemActive
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                      }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className={`menu-item-text`}>{nav.name}</span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  height: isSubmenuOpen ? 'auto' : '0px',
                  opacity: isSubmenuOpen ? 1 : 0,
                }}
              >
                <ul className="mt-0.5 mb-1 space-y-0.5 ml-[18px] pl-2.5 border-l border-gray-200 dark:border-gray-800">
                  {nav.subItems.map((subItem, subIndex) => {
                    const isSubItemActive = subItem.path ? isActive(subItem.path) : false;
                    const isSubSubmenuOpen = openSubSubmenu?.type === menuType &&
                      openSubSubmenu?.parentIndex === index &&
                      openSubSubmenu?.subIndex === subIndex;
                    
                    return (
                      <li key={subItem.name}>
                        {subItem.subSubItems && subItem.subSubItems.length > 0 ? (
                          <>
                            <button
                              onClick={() => handleSubSubmenuToggle(index, subIndex, menuType)}
                              className={`menu-dropdown-item w-full text-left cursor-pointer ${isSubSubmenuOpen
                                  ? "menu-dropdown-item-active"
                                  : "menu-dropdown-item-inactive"
                                }`}
                            >
                              {subItem.name}
                              <span className="flex items-center gap-1 ml-auto">
                                {subItem.new && (
                                  <span
                                    className={`ml-auto ${isSubSubmenuOpen
                                        ? "menu-dropdown-badge-active"
                                        : "menu-dropdown-badge-inactive"
                                      } menu-dropdown-badge `}
                                  >
                                    new
                                  </span>
                                )}
                                <FiChevronDown
                                  size={14}
                                  className={`shrink-0 transition-transform duration-200  ${isSubSubmenuOpen
                                      ? "rotate-180 text-brand-500"
                                      : "text-gray-400"
                                    }`}
                                />
                              </span>
                            </button>

                            {/* Third Layer Menu */}
                            <div
                              className="overflow-hidden transition-all duration-300"
                              style={{
                                height: isSubSubmenuOpen ? 'auto' : '0px',
                                opacity: isSubSubmenuOpen ? 1 : 0,
                              }}
                            >
                              <ul className="mt-2 space-y-1 ml-6">
                                {subItem.subSubItems.map((subSubItem) => (
                                  <li key={subSubItem.name}>
                                    <Link
                                      href={subSubItem.path}
                                      className={`menu-dropdown-item pl-4 ${isActive(subSubItem.path)
                                          ? "menu-dropdown-item-active"
                                          : "menu-dropdown-item-inactive"
                                        }`}
                                    >
                                      {subSubItem.name}
                                      <span className="flex items-center gap-1 ml-auto">
                                        {subSubItem.new && (
                                          <span
                                            className={`ml-auto ${isActive(subSubItem.path)
                                                ? "menu-dropdown-badge-active"
                                                : "menu-dropdown-badge-inactive"
                                              } menu-dropdown-badge `}
                                          >
                                            new
                                          </span>
                                        )}
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </>
                        ) : (
                          <Link
                            href={subItem.path!}
                            className={`menu-dropdown-item ${isSubItemActive
                                ? "menu-dropdown-item-active"
                                : "menu-dropdown-item-inactive"
                              }`}
                          >
                            {subItem.name}
                            <span className="flex items-center gap-1 ml-auto">
                              {subItem.new && (
                                <span
                                  className={`ml-auto ${isSubItemActive
                                      ? "menu-dropdown-badge-active"
                                      : "menu-dropdown-badge-inactive"
                                    } menu-dropdown-badge `}
                                >
                                  new
                                </span>
                              )}
                            </span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  // Show loading state while checking permissions
  if (loading) {
    return (
      <aside className={`fixed mt-14 flex flex-col lg:mt-0 top-0 px-3 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-200 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[232px]" : isHovered ? "w-[232px]" : "w-[68px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">Loading...</div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed mt-14 flex flex-col lg:mt-0 top-0 px-3 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-200 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen
          ? "w-[232px]"
          : isHovered
            ? "w-[232px]"
            : "w-[68px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`h-14 shrink-0 flex items-center px-1 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Multibrand POS"
                width={160}
                height={32}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Multibrand POS"
                width={160}
                height={32}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Multibrand POS"
              width={28}
              height={28}
            />
          )}
        </Link>
      </div>
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="relative shrink-0 pb-1">
          <FiSearch size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 -mt-0.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearch("");
              if (e.key === "Enter" && searchResults[0]) router.push(searchResults[0].path);
            }}
            placeholder="Search menu..."
            className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-2 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white/90 dark:focus:border-brand-800"
          />
        </div>
      )}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear custom-scrollbar pb-4">
        {search.trim() ? (
          <ul className="mt-2 flex flex-col gap-0.5">
            {searchResults.length > 0 ? (
              searchResults.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className={`menu-dropdown-item ${isActive(link.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{link.name}</span>
                      {link.parent && <span className="block truncate text-[11px] text-gray-400">{link.parent}</span>}
                    </span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-2.5 py-2 text-[13px] text-gray-400">No menu found</li>
            )}
          </ul>
        ) : (
        <nav className="mt-2">
          <div className="flex flex-col gap-3">
            <div>
              <h2
                className={`mb-1.5 px-2.5 text-[11px] font-medium tracking-wide uppercase flex leading-[18px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {filteredNavItems.length > 0 ? (
                renderMenuItems(filteredNavItems, "main")
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">No menu items available</p>
              )}
            </div>

            {filteredOthersItems.length > 0 && (
              <div>
                <h2
                  className={`mb-1.5 px-2.5 text-[11px] font-medium tracking-wide uppercase flex leading-[18px] text-gray-400 ${!isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                    }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Others"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(filteredOthersItems, "others")}
              </div>
            )}
          </div>
        </nav>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;