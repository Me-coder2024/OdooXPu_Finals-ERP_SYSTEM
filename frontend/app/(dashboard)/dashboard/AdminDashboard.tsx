'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { dashboardApi, usersApi } from '@/lib/api/client';
import { DashboardStats, User } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
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
  Activity,
} from 'lucide-react';

const REFRESH_INTERVAL = 30_000;

// Role badge colors
const ROLE_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  ADMIN: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  OWNER: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  SALES: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  PURCHASE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  MANUFACTURING: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  INVENTORY: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

export default function AdminDashboard() {
  const { user: currentUser } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await dashboardApi.getStats();
      setStats(res.data.data);
      setLastRefreshed(new Date());
    } catch (err) { console.error('Failed to load stats:', err); }
    finally { setLoading(false); setIsRefreshing(false); }
  }, []);

  const fetchRecentUsers = useCallback(async () => {
    try { const res = await usersApi.getAll({ limit: 5 }); setRecentUsers(res.data.data || []); }
    catch (err) { console.error('Failed to load users:', err); }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentUsers();
    intervalRef.current = setInterval(() => fetchStats(true), REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStats, fetchRecentUsers]);

  const handleRefresh = () => { fetchStats(true); fetchRecentUsers(); };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your ERP operations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 w-28 bg-slate-100 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-20 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ Header with Live indicator ═══ */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your ERP operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-700">Live</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>
      </div>

      {/* ═══ Main Stat Cards — matches admin wireframe ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {[
          { title: 'Total Products', value: stats?.overview.totalProducts || 0, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/products' },
          { title: 'Sales Orders', value: stats?.salesOrders.total || 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', href: '/sales-orders' },
          { title: 'Purchase Orders', value: stats?.purchaseOrders.total || 0, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50', href: '/purchase-orders' },
          { title: 'Manufacturing Orders', value: stats?.manufacturingOrders.total || 0, icon: Factory, color: 'text-violet-600', bg: 'bg-violet-50', href: '/manufacturing-orders' },
        ].map((card) => {
          const CardIcon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <CardIcon size={20} className={card.color} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums mb-2">{card.value}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-blue-600 transition-colors">
                <span>View details</span>
                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ═══ Revenue + Stats Row ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-600" />
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(stats?.overview.totalRevenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-600" />
            <p className="text-sm font-medium text-slate-500">Total Customers</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats?.overview.totalCustomers || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={16} className="text-amber-600" />
            <p className="text-sm font-medium text-slate-500">Total Vendors</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats?.overview.totalVendors || 0}</p>
        </div>
      </div>

      {/* ═══ Recent Users + Recent Orders ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Users Panel */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Users</h3>
            </div>
            <Link href="/users" className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {usersLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-1"><div className="h-3 w-24 bg-slate-100 rounded" /><div className="h-2.5 w-16 bg-slate-50 rounded" /></div>
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
              {recentUsers.map(user => {
                const badge = ROLE_BADGE[user.role] || ROLE_BADGE.INVENTORY;
                return (
                  <Link key={user.id} href={`/users/${user.id}`} className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <UserCircle size={18} className="text-slate-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors leading-tight">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{user.email}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                      <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                      {user.role}
                    </span>
                  </Link>
                );
              })}
              <Link href="/users" className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-medium text-blue-600 hover:bg-blue-50/50 transition-colors">
                View all users <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Sales Orders */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Sales Orders</h3>
            </div>
            <Link href="/sales-orders" className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">View all <ArrowRight size={12} /></Link>
          </div>
          {!stats?.recent.salesOrders || stats.recent.salesOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">No recent sales orders</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.recent.salesOrders.map(so => (
                <Link key={so.id} href={`/sales-orders/${so.id}`} className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{so.so_number}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{(so.customer as { name: string })?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(so.total_amount)}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      so.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : so.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' : so.status === 'FULLY_DELIVERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{so.status.replace(/_/g, ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchase Orders */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Purchase Orders</h3>
            </div>
            <Link href="/purchase-orders" className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">View all <ArrowRight size={12} /></Link>
          </div>
          {!stats?.recent.purchaseOrders || stats.recent.purchaseOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">No recent purchase orders</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.recent.purchaseOrders.map(po => (
                <Link key={po.id} href={`/purchase-orders/${po.id}`} className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{po.po_number}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{(po.vendor as { name: string })?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(po.total_amount)}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      po.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : po.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' : po.status === 'FULLY_RECEIVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{po.status.replace(/_/g, ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Low Stock Alerts ═══ */}
      {stats?.alerts.lowStockProducts && stats.alerts.lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Low Stock Alerts</h2>
            <span className="ml-auto text-xs text-slate-400">{stats.alerts.lowStockProducts.length} product(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">SKU</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">On Hand</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">Min Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.alerts.lowStockProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-5 text-slate-900 font-medium">{p.name}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-xs">{p.sku}</td>
                    <td className="py-2.5 px-4 text-right text-amber-700 font-semibold tabular-nums">{p.on_hand_qty}</td>
                    <td className="py-2.5 px-4 text-right text-slate-500 tabular-nums">{p.min_stock_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
