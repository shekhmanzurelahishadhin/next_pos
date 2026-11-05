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
type SubItem = {
  name: string;
  path: string;
  group?: string; // small label shown above the first item of each group
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  section: string; // heading the item is listed under
  path?: string;
  subItems?: SubItem[];
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

const navItems: NavItem[] = [
  {
    icon: <FiGrid />,
    name: "Dashboard",
    section: "Main",
    path: "/",
  },
  {
    icon: <FiUser />,
    name: "User Roles",
    section: "Administration",
    subItems: [
      { name: "Roles", path: "/authorization/roles", requiredPermissions: ["role.view", "role.create", "role.edit", "role.delete"] },
      { name: "Permissions", path: "/authorization/permissions", requiredPermissions: ["permission.view", "permission.create", "permission.edit", "permission.delete"] },
      { name: "Users", path: "/users", requiredPermissions: ["user.view", "user.create", "user.edit", "user.delete"] },
    ],
  },
  {
    icon: <FiSettings />,
    name: "Soft Configure",
    section: "Administration",
    subItems: [
      { group: "Company & Store", name: "Company", path: "/configure/companies", requiredPermissions: ["company.view", "company.create", "company.edit", "company.delete"] },
      { group: "Company & Store", name: "Stores", path: "/configure/stores", requiredPermissions: ["store.view", "store.create", "store.edit", "store.delete"] },
      { group: "Company & Store", name: "Store Location", path: "/configure/locations", requiredPermissions: ["location.view", "location.create", "location.edit", "location.delete"] },
      { group: "Product", name: "Category", path: "/configure/categories", requiredPermissions: ["category.view", "category.create", "category.edit", "category.delete"] },
      { group: "Product", name: "Sub-Category", path: "/configure/sub-categories", requiredPermissions: ["sub-category.view", "sub-category.create", "sub-category.edit", "sub-category.delete"] },
      { group: "Product", name: "Units", path: "/configure/units", requiredPermissions: ["unit.view", "unit.create", "unit.edit", "unit.delete"] },
      { group: "Product", name: "Brands", path: "/configure/brands", requiredPermissions: ["brand.view", "brand.create", "brand.edit", "brand.delete"] },
      { group: "Product", name: "Products", path: "/configure/products", requiredPermissions: ["product.view", "product.create", "product.edit", "product.delete"] },
      { group: "Pricing", name: "PP/SP Setup", path: "/configure/pp-sp-setup", requiredPermissions: ["pp-sp-setup.view", "pp-sp-setup.create", "pp-sp-setup.edit", "pp-sp-setup.delete"] },
      { group: "Pricing", name: "Purchase Price", path: "/configure/purchase-price", requiredPermissions: ["purchase-price.view", "purchase-price.create"] },
      { group: "Pricing", name: "Sale Price", path: "/configure/sale-price", requiredPermissions: ["sell-price.view", "sell-price.create"] },
      { group: "System", name: "Lookups", path: "/configure/lookups", requiredPermissions: ["lookup.view", "lookup.create", "lookup.edit", "lookup.delete"] },
      { group: "System", name: "Scroll Number Setup", path: "/configure/scroll-setup", requiredPermissions: ["scroll-setup.view", "scroll-setup.edit"] },
    ],
  },
  {
    name: "Purchases",
    icon: <FiShoppingCart />,
    section: "Business",
    subItems: [
      { group: "Supplier", name: "Suppliers", path: "/purchases/suppliers", requiredPermissions: ["supplier.view", "supplier.create", "supplier.edit", "supplier.delete"] },
      { group: "Purchase", name: "Purchase", path: "/purchases/purchase", requiredPermissions: ["purchase.create"] },
      { group: "Purchase", name: "Purchase Manage", path: "/purchases/manage", requiredPermissions: ["purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.approve"] },
      { group: "Return", name: "Purchase Return", path: "/purchases/return", requiredPermissions: ["purchase-return.create"] },
      { group: "Return", name: "Purchase Return Manage", path: "/purchases/return-manage", requiredPermissions: ["purchase-return.view", "purchase-return.create", "purchase-return.delete"] },
      { group: "Payment", name: "Supplier Payment", path: "/purchases/supplier-payment", requiredPermissions: ["supplier-payment.create"] },
      { group: "Payment", name: "Supplier Payment Manage", path: "/purchases/supplier-payment-manage", requiredPermissions: ["supplier-payment.view", "supplier-payment.create", "supplier-payment.delete"] },
    ],
  },
  {
    name: "Inventory",
    icon: <FiBox />,
    section: "Business",
    subItems: [
      { group: "Stock", name: "Inventory Stock", path: "/inventory/stock", requiredPermissions: ["inventory-stock.view"] },
      { group: "Stock", name: "Inventory Barcode", path: "/inventory/barcode", requiredPermissions: ["inventory-barcode.view"] },
      { group: "Short List", name: "Short List Order", path: "/inventory/short-list-order", requiredPermissions: ["short-list-order.create"] },
      { group: "Short List", name: "Short List Order Manage", path: "/inventory/short-list-order-manage", requiredPermissions: ["short-list-order.view", "short-list-order.create", "short-list-order.delete"] },
      { group: "Transfer", name: "Stock Transfer Entry", path: "/inventory/stock-transfer", requiredPermissions: ["stock-transfer.create"] },
      { group: "Transfer", name: "Stock Transfer Manage", path: "/inventory/stock-transfer-manage", requiredPermissions: ["stock-transfer.view", "stock-transfer.create", "stock-transfer.edit", "stock-transfer.delete", "stock-transfer.approve"] },
      { group: "Audit", name: "Audit Name Setup", path: "/inventory/audit-names", requiredPermissions: ["audit-name.view", "audit-name.create", "audit-name.edit", "audit-name.delete"] },
      { group: "Audit", name: "Inventory Audit Entry", path: "/inventory/audit", requiredPermissions: ["inventory-audit.create"] },
      { group: "Audit", name: "Inventory Audit Manage", path: "/inventory/audit-manage", requiredPermissions: ["inventory-audit.view", "inventory-audit.create", "inventory-audit.edit", "inventory-audit.delete"] },
    ],
  },
  {
    name: "Sales",
    icon: <FiShoppingBag />,
    section: "Business",
    subItems: [
      { group: "Customer", name: "Customers", path: "/sales/customers", requiredPermissions: ["customer.view", "customer.create", "customer.edit", "customer.delete"] },
      { group: "Customer", name: "Customers Contact", path: "/sales/customers-contact", requiredPermissions: ["customer-contact.view", "customer-contact.create", "customer-contact.edit", "customer-contact.delete"] },
      { group: "Sales", name: "Sales", path: "/sales/sale", requiredPermissions: ["sale.create"] },
      { group: "Sales", name: "Sales Manage", path: "/sales/manage", requiredPermissions: ["sale.view", "sale.create", "sale.edit", "sale.delete", "sale.approve"] },
      { group: "Return", name: "Sales Return", path: "/sales/return", requiredPermissions: ["sale-return.create"] },
      { group: "Return", name: "Sales Return Manage", path: "/sales/return-manage", requiredPermissions: ["sale-return.view", "sale-return.create", "sale-return.delete"] },
      { group: "Money Receipt", name: "Money Receipt", path: "/sales/money-receipt", requiredPermissions: ["money-receipt.create"] },
      { group: "Money Receipt", name: "Money Receipt Manage", path: "/sales/money-receipt-manage", requiredPermissions: ["money-receipt.view", "money-receipt.create", "money-receipt.delete"] },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { loading, hasRole, hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const showText = isExpanded || isHovered || isMobileOpen;

  const isActive = useCallback((menuPath: string) => pathname === menuPath || pathname.startsWith(menuPath + "/"), [pathname]);

  // A menu is shown when the user has one of its roles / permissions (no restriction = everyone)
  const hasAccess = useCallback((item: { requiredRoles?: string[]; requiredPermissions?: string[] }) => {
    if (item.requiredRoles?.length && !item.requiredRoles.some((role) => hasRole(role))) return false;
    if (item.requiredPermissions?.length && !item.requiredPermissions.some((permission) => hasPermission(permission))) return false;
    return true;
  }, [hasRole, hasPermission]);

  // Only the menus the user can open; a module without any visible link is hidden
  const visibleItems = useMemo(() => navItems
    .filter(hasAccess)
    .map((item) => (item.subItems ? { ...item, subItems: item.subItems.filter(hasAccess) } : item))
    .filter((item) => item.path || item.subItems?.length), [hasAccess]);

  // Menu search: every link the user can open, matched by its name or its module's name
  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const links: { name: string; parent?: string; path: string }[] = [];
    visibleItems.forEach((nav) => {
      if (nav.path) links.push({ name: nav.name, path: nav.path });
      nav.subItems?.forEach((sub) => links.push({ name: sub.name, parent: nav.name, path: sub.path }));
    });
    return links.filter((link) => `${link.name} ${link.parent ?? ""}`.toLowerCase().includes(term));
  }, [search, visibleItems]);

  // The module holding the current page, used to highlight it and open it on page change
  const activeModule = useMemo(
    () => visibleItems.find((nav) => nav.subItems?.some((sub) => isActive(sub.path)))?.name ?? null,
    [visibleItems, isActive]
  );

  useEffect(() => {
    setSearch("");
    if (activeModule) setOpenMenu(activeModule);
  }, [pathname, activeModule]);

  const sections = useMemo(() => {
    const result: { title: string; items: NavItem[] }[] = [];
    visibleItems.forEach((item) => {
      const last = result[result.length - 1];
      if (last?.title === item.section) last.items.push(item);
      else result.push({ title: item.section, items: [item] });
    });
    return result;
  }, [visibleItems]);

  const iconBox = (active: boolean) =>
    `flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors [&>svg]:h-4 [&>svg]:w-4 ${
      active
        ? "bg-brand-500 text-white shadow-theme-xs"
        : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-gray-700 dark:bg-white/[0.06] dark:text-gray-400 dark:group-hover:bg-white/10 dark:group-hover:text-gray-200"
    }`;

  const itemClass = (active: boolean) =>
    `group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium transition-colors ${
      active
        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
    } ${showText ? "justify-start" : "lg:justify-center"}`;

  const renderSubItems = (nav: NavItem) => (
    <ul className="ml-[22px] border-l border-gray-200 py-1 pl-3 dark:border-gray-800">
      {nav.subItems!.map((sub, i) => {
        const active = isActive(sub.path);
        const newGroup = sub.group && sub.group !== nav.subItems![i - 1]?.group;
        return (
          <li key={sub.path}>
            {newGroup && (
              <div className={`px-2 pb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${i > 0 ? "mt-2.5" : "mt-0.5"}`}>
                {sub.group}
              </div>
            )}
            <Link
              href={sub.path}
              className={`relative flex items-center rounded-md px-2 py-[5px] text-[13px] transition-colors ${
                active
                  ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
              }`}
            >
              {/* marker on the rail next to the open page */}
              {active && <span className="absolute -left-[13.5px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-500" />}
              <span className="truncate">{sub.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const renderItem = (nav: NavItem) => {
    if (!nav.subItems) {
      const active = isActive(nav.path!);
      return (
        <Link href={nav.path!} title={showText ? undefined : nav.name} className={itemClass(active)}>
          <span className={iconBox(active)}>{nav.icon}</span>
          {showText && <span className="truncate">{nav.name}</span>}
        </Link>
      );
    }

    const open = openMenu === nav.name;
    const active = activeModule === nav.name;
    return (
      <>
        <button
          type="button"
          title={showText ? undefined : nav.name}
          onClick={() => setOpenMenu(open ? null : nav.name)}
          className={`${itemClass(active)} cursor-pointer`}
        >
          <span className={iconBox(active)}>{nav.icon}</span>
          {showText && (
            <>
              <span className="truncate">{nav.name}</span>
              <span className="ml-auto rounded-full bg-gray-100 px-1.5 text-[10.5px] font-medium leading-4 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                {nav.subItems.length}
              </span>
              <FiChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-brand-500" : "text-gray-400"}`} />
            </>
          )}
        </button>
        {showText && (
          // grid rows animate the open / close smoothly to the real height
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">{renderSubItems(nav)}</div>
          </div>
        )}
      </>
    );
  };

  const asideClass = `fixed mt-14 flex flex-col lg:mt-0 top-0 px-3 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-200 ease-in-out z-50 border-r border-gray-200
    ${showText ? "w-[240px]" : "w-[68px]"}
    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0`;

  // Show loading state while checking permissions
  if (loading) {
    return (
      <aside className={asideClass}>
        <div className="flex h-full items-center justify-center text-sm text-gray-400">Loading...</div>
      </aside>
    );
  }

  return (
    <aside
      className={asideClass}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`h-14 shrink-0 flex items-center px-1 ${showText ? "justify-start" : "lg:justify-center"}`}>
        <Link href="/">
          {showText ? (
            <>
              <Image className="dark:hidden" src="/images/logo/logo.svg" alt="Multibrand POS" width={160} height={32} />
              <Image className="hidden dark:block" src="/images/logo/logo-dark.svg" alt="Multibrand POS" width={160} height={32} />
            </>
          ) : (
            <Image src="/images/logo/logo-icon.svg" alt="Multibrand POS" width={28} height={28} />
          )}
        </Link>
      </div>

      {showText && (
        <div className="relative shrink-0 pb-2">
          <FiSearch size={14} className="pointer-events-none absolute left-2.5 top-1/2 -mt-1 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearch("");
              if (e.key === "Enter" && searchResults[0]) router.push(searchResults[0].path);
            }}
            placeholder="Search menu..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-2 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white/90 dark:focus:border-brand-800"
          />
        </div>
      )}

      <div className="custom-scrollbar flex flex-col overflow-y-auto pb-6">
        {search.trim() ? (
          <ul className="mt-1 flex flex-col gap-0.5">
            {searchResults.length > 0 ? (
              searchResults.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className={`block rounded-md px-2.5 py-1.5 text-[13px] ${
                      isActive(link.path)
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="block truncate font-medium">{link.name}</span>
                    {link.parent && <span className="block truncate text-[11px] text-gray-400">{link.parent}</span>}
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-2.5 py-2 text-[13px] text-gray-400">No menu found</li>
            )}
          </ul>
        ) : (
          <nav className="flex flex-col gap-4">
            {sections.length === 0 && <p className="py-2 text-center text-sm text-gray-500">No menu items available</p>}
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className={`mb-1 flex px-2 text-[11px] font-semibold uppercase leading-[18px] tracking-wider text-gray-400 dark:text-gray-500 ${showText ? "justify-start" : "lg:justify-center"}`}>
                  {showText ? section.title : <HorizontaLDots />}
                </h2>
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((nav) => (
                    <li key={nav.name}>{renderItem(nav)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
