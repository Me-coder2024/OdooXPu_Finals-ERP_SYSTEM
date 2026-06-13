'use client';

import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Factory,
  FileText,
  Warehouse,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: null },
  { name: 'Products', href: '/products', icon: Package, module: 'PRODUCTS' },
  { name: 'Sales Orders', href: '/sales-orders', icon: ShoppingCart, module: 'SALES' },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: Truck, module: 'PURCHASE' },
  { name: 'Bill of Materials', href: '/boms', icon: FileText, module: 'BOM' },
  { name: 'Manufacturing', href: '/manufacturing-orders', icon: Factory, module: 'MANUFACTURING' },
  { name: 'Work Centers', href: '/work-centers', icon: Settings, module: 'MANUFACTURING' },
  { name: 'Stock Ledger', href: '/stock-ledger', icon: Warehouse, module: 'INVENTORY' },
  { name: 'Users', href: '/users', icon: Users, module: 'USERS' },
  { name: 'Audit Logs', href: '/audit-logs', icon: ClipboardList, module: 'AUDIT' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasModuleAccess } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();

  const filteredNavItems = navigationItems.filter((item) => {
    if (!item.module) return true;
    return hasModuleAccess(item.module);
  });

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-200 z-40 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        {!collapsed && (
          <span className="text-base font-semibold text-slate-900 truncate">
            Shiv Furniture
          </span>
        )}
        <button
          onClick={() => toggle()}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            size={18}
            className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors w-full"
          title="Logout"
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
