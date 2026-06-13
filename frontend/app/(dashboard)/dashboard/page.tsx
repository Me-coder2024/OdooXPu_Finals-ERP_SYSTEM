'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { dashboardApi, usersApi } from '@/lib/api/client';
import { DashboardStats, User } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Truck,
  Factory,
  AlertTriangle,
  TrendingUp,
  Users,
  UserCircle,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Shield,
  Eye,
  Ban,
  Activity,
} from 'lucide-react';

// ─── Auto-refresh interval (ms) ───
const REFRESH_INTERVAL = 30_000; // 30 seconds

// ─── Role config ───
const ROLE_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  ADMIN: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  OWNER: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  SALES: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  PURCHASE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  MANUFACTURING: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  INVENTORY: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

const ACCESS_ICON_MAP: Record<string, { icon: typeof Shield; color: string }> = {
  FULL: { icon: Shield, color: 'text-emerald-500' },
  VIEW: { icon: Eye, color: 'text-amber-500' },
  NONE: { icon: Ban, color: 'text-slate-300' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch dashboard stats ───
  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await dashboardApi.getStats();
      setStats(res.data.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ─── Fetch recent users ───
  const fetchRecentUsers = useCallback(async () => {
    try {
      const res = await usersApi.getAll({ limit: 5 });
      setRecentUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ─── Initial load + auto-refresh ───
  useEffect(() => {
    fetchStats();
    fetchRecentUsers();

    // Auto-refresh polling
    intervalRef.current = setInterval(() => {
      fetchStats(true); // silent refresh (no loading spinner)
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStats, fetchRecentUsers]);

  // ─── Manual refresh handler ───
  const handleRefresh = () => {
    fetchStats(true);
    fetchRecentUsers();
  };

  // ─── Status bar chart ───
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-300',
    CONFIRMED: 'bg-blue-500',
    IN_PROGRESS: 'bg-amber-500',
    PARTIALLY_DELIVERED: 'bg-sky-400',
    FULLY_DELIVERED: 'bg-emerald-500',
    PARTIALLY_RECEIVED: 'bg-sky-400',
    FULLY_RECEIVED: 'bg-emerald-500',
    DONE: 'bg-emerald-500',
    CANCELLED: 'bg-red-400',
  };

  const renderBarChart = (data: Record<string, number>, label: string) => {
    const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{label}</h3>
        {Object.keys(data).length === 0 ? (
          <p className="text-xs text-slate-400 italic">No data yet</p>
        ) : (
          <div className="space-y-2.5">
            {Object.entries(data).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 w-32 truncate font-medium">
                  {status.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 h-[18px] bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${statusColors[status] || 'bg-slate-400'}`}
                    style={{
                      width: `${(count / total) * 100}%`,
                      minWidth: count > 0 ? '8px' : '0',
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-8 text-right tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getAccess = (user: User, mod: string) => {
    const a = user.module_access?.find((m) => m.module === mod);
    return a?.access_type || 'NONE';
  };

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your ERP operations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
                <div className="w-9 h-9 rounded-lg bg-slate-100" />
              </div>
              <div className="h-8 w-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
              <div className="h-4 w-40 bg-slate-100 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 bg-slate-50 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
          <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-slate-100 rounded" />
                  <div className="h-3 w-48 bg-slate-50 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.overview.totalProducts || 0,
      icon: Package,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      borderColor: 'border-blue-100',
      href: '/products',
    },
    {
      title: 'Sales Orders',
      value: stats?.salesOrders.total || 0,
      icon: ShoppingCart,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      href: '/sales-orders',
    },
    {
      title: 'Purchase Orders',
      value: stats?.purchaseOrders.total || 0,
      icon: Truck,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      borderColor: 'border-amber-100',
      href: '/purchase-orders',
    },
    {
      title: 'Manufacturing Orders',
      value: stats?.manufacturingOrders.total || 0,
      icon: Factory,
      color: 'text-violet-700',
      bg: 'bg-violet-50',
      borderColor: 'border-violet-100',
      href: '/manufacturing-orders',
    },
  ];

  const soByStatus = stats?.salesOrders.byStatus || {};
  const poByStatus = stats?.purchaseOrders.byStatus || {};
  const moByStatus = stats?.manufacturingOrders.byStatus || {};

  return (
    <div>
      {/* ═══ Header with live indicator ═══ */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your ERP operations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-700">Live</span>
          </div>

          {/* Last refreshed + manual refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            title={`Last updated: ${lastRefreshed.toLocaleTimeString()}`}
          >
            <RefreshCw
              size={13}
              className={isRefreshing ? 'animate-spin' : ''}
            />
            {isRefreshing ? 'Refreshing...' : `Updated ${lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
          </button>
        </div>
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <div
                  className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <Icon size={18} className={card.color} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                {card.value.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 group-hover:text-primary transition-colors">
                <span>View details</span>
                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ═══ Revenue + Customers/Vendors Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Total Revenue
            </p>
            <p className="text-xl font-bold text-slate-900 tabular-nums truncate">
              {formatCurrency(stats?.overview.totalRevenue || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">From confirmed & delivered SOs</p>
          </div>
        </div>

        {/* Customers */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Users size={20} className="text-blue-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Customers
            </p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">
              {(stats?.overview.totalCustomers || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total registered customers</p>
          </div>
        </div>

        {/* Vendors */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Truck size={20} className="text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Vendors
            </p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">
              {(stats?.overview.totalVendors || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total registered vendors</p>
          </div>
        </div>
      </div>

      {/* ═══ Charts + Recent Users Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Status Charts — 3 columns */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {renderBarChart(soByStatus, 'Sales Orders by Status')}
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {renderBarChart(poByStatus, 'Purchase Orders by Status')}
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {renderBarChart(moByStatus, 'Manufacturing Orders by Status')}
          </div>
        </div>

        {/* ═══ Recent Users Panel — 1 column ═══ */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-primary" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Users</h3>
            </div>
            <Link
              href="/users"
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              View all
              <ArrowRight size={12} />
            </Link>
          </div>

          {usersLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                    <div className="h-2.5 w-16 bg-slate-50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center px-4">
              <UserCircle size={28} className="text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No users yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentUsers.map((user) => {
                const badge = ROLE_BADGE[user.role] || ROLE_BADGE.INVENTORY;
                return (
                  <Link
                    key={user.id}
                    href={`/users/${user.id}`}
                    className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <UserCircle
                        size={18}
                        className="text-slate-400"
                        strokeWidth={1.5}
                      />
                    </div>

                    {/* Name + Email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary transition-colors leading-tight">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    {/* Role badge */}
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                      {user.role}
                    </span>

                    {/* Arrow */}
                    <ChevronRight
                      size={14}
                      className="text-slate-300 group-hover:text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                    />
                  </Link>
                );
              })}

              {/* "View all users" footer link */}
              <Link
                href="/users"
                className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <span>View all {recentUsers.length < 5 ? '' : 'users'}</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Low Stock Alerts ═══ */}
      {stats?.alerts.lowStockProducts && stats.alerts.lowStockProducts.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Low Stock Alerts</h2>
            <span className="ml-auto text-xs text-slate-400">
              {stats.alerts.lowStockProducts.length} product{stats.alerts.lowStockProducts.length !== 1 ? 's' : ''} below threshold
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    On Hand
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Reserved
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Free
                  </th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Min Stock
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.alerts.lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-5 text-slate-900 font-medium">{p.name}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-xs">{p.sku}</td>
                    <td className="py-2.5 px-4 text-right text-slate-700 tabular-nums">{p.on_hand_qty}</td>
                    <td className="py-2.5 px-4 text-right text-slate-700 tabular-nums">{p.reserved_qty}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-amber-700 tabular-nums">
                      {p.free_to_use_qty}
                    </td>
                    <td className="py-2.5 px-5 text-right text-slate-500 tabular-nums">{p.min_stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Recent Activity Row ═══ */}
      {stats?.recent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales Orders */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Recent Sales Orders</h3>
              </div>
              <Link
                href="/sales-orders"
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                View all
                <ArrowRight size={12} />
              </Link>
            </div>
            {stats.recent.salesOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No recent sales orders</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {stats.recent.salesOrders.map((so) => (
                  <Link
                    key={so.id}
                    href={`/sales-orders/${so.id}`}
                    className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">
                        {so.so_number}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {(so.customer as { name: string })?.name || '—'} · {formatDateTime(so.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(so.total_amount)}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          so.status === 'DRAFT'
                            ? 'bg-slate-100 text-slate-600'
                            : so.status === 'CONFIRMED'
                              ? 'bg-blue-50 text-blue-700'
                              : so.status === 'FULLY_DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {so.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Purchase Orders */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900">Recent Purchase Orders</h3>
              </div>
              <Link
                href="/purchase-orders"
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                View all
                <ArrowRight size={12} />
              </Link>
            </div>
            {stats.recent.purchaseOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">No recent purchase orders</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {stats.recent.purchaseOrders.map((po) => (
                  <Link
                    key={po.id}
                    href={`/purchase-orders/${po.id}`}
                    className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">
                        {po.po_number}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {(po.vendor as { name: string })?.name || '—'} · {formatDateTime(po.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(po.total_amount)}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          po.status === 'DRAFT'
                            ? 'bg-slate-100 text-slate-600'
                            : po.status === 'CONFIRMED'
                              ? 'bg-blue-50 text-blue-700'
                              : po.status === 'FULLY_RECEIVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {po.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
