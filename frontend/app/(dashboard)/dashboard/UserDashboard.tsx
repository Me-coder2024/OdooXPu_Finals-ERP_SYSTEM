'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { dashboardApi } from '@/lib/api/client';
import { DashboardStats } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import {
  ShoppingCart,
  Truck,
  Factory,
  RefreshCw,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

const REFRESH_INTERVAL = 30_000;

// Status labels for each order type
const SO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', CONFIRMED: 'Confirmed', PARTIALLY_DELIVERED: 'Partially Delivered', FULLY_DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};
const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', CONFIRMED: 'Confirmed', PARTIALLY_RECEIVED: 'Partially Received', FULLY_RECEIVED: 'Received', CANCELLED: 'Cancelled',
};
const MO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In-Progress', DONE: 'Done', CANCELLED: 'Cancelled',
};

// Status pill colors on dark card
const STATUS_PILL_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-600 text-slate-100',
  CONFIRMED: 'bg-blue-600 text-blue-100',
  PARTIALLY_DELIVERED: 'bg-sky-600 text-sky-100',
  FULLY_DELIVERED: 'bg-emerald-600 text-emerald-100',
  PARTIALLY_RECEIVED: 'bg-sky-600 text-sky-100',
  FULLY_RECEIVED: 'bg-emerald-600 text-emerald-100',
  IN_PROGRESS: 'bg-amber-600 text-amber-100',
  DONE: 'bg-emerald-600 text-emerald-100',
  CANCELLED: 'bg-red-600 text-red-100',
};

type TabMode = 'all' | 'my';

export default function UserDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active tab per card
  const [soTab, setSoTab] = useState<TabMode>('all');
  const [poTab, setPoTab] = useState<TabMode>('all');
  const [moTab, setMoTab] = useState<TabMode>('all');

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

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(() => fetchStats(true), REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStats]);

  const handleRefresh = () => fetchStats(true);

  // Helper: render status pills in the dark card
  const renderStatusPills = (byStatus: Record<string, number> | undefined, labels: Record<string, string>) => {
    if (!byStatus) return null;
    const entries = Object.entries(byStatus).filter(([, count]) => count > 0);
    if (entries.length === 0) return <p className="text-xs text-slate-400 mt-3 italic">No orders yet</p>;
    return (
      <div className="flex flex-wrap gap-1.5 mt-4">
        {entries.map(([status, count]) => (
          <span key={status} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_PILL_COLORS[status] || 'bg-slate-600 text-slate-100'}`}>
            {labels[status] || status.replace(/_/g, ' ')}: {count}
          </span>
        ))}
      </div>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Your workspace overview</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 w-24 bg-slate-700 rounded mb-4" />
              <div className="h-10 w-16 bg-slate-700 rounded mb-3" />
              <div className="flex gap-2"><div className="h-4 w-16 bg-slate-700 rounded" /><div className="h-4 w-16 bg-slate-700 rounded" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Data extraction (with safe fallbacks)
  const soByStatus = stats?.salesOrders?.byStatus || {};
  const poByStatus = stats?.purchaseOrders?.byStatus || {};
  const moByStatus = stats?.manufacturingOrders?.byStatus || {};

  // "My" status counts — from API myByStatus if available, otherwise empty
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsAny = stats as any;
  const mySOByStatus: Record<string, number> = statsAny?.salesOrders?.myByStatus || {};
  const myPOByStatus: Record<string, number> = statsAny?.purchaseOrders?.myByStatus || {};
  const myMOByStatus: Record<string, number> = statsAny?.manufacturingOrders?.myByStatus || {};

  const soTotal = stats?.salesOrders?.total || 0;
  const poTotal = stats?.purchaseOrders?.total || 0;
  const moTotal = stats?.manufacturingOrders?.total || 0;

  const mySOTotal = Object.values(mySOByStatus).reduce((a: number, b: number) => a + b, 0);
  const myPOTotal = Object.values(myPOByStatus).reduce((a: number, b: number) => a + b, 0);
  const myMOTotal = Object.values(myMOByStatus).reduce((a: number, b: number) => a + b, 0);

  // Card data
  const cards = [
    {
      title: 'Sales Orders', icon: ShoppingCart, href: '/sales-orders',
      allTotal: soTotal, myTotal: mySOTotal,
      allByStatus: soByStatus, myByStatus: mySOByStatus,
      labels: SO_STATUS_LABELS, tab: soTab, setTab: setSoTab,
      gradient: 'from-slate-800 to-slate-900',
      accent: 'text-blue-400', iconBg: 'bg-blue-500/10',
    },
    {
      title: 'Purchase Orders', icon: Truck, href: '/purchase-orders',
      allTotal: poTotal, myTotal: myPOTotal,
      allByStatus: poByStatus, myByStatus: myPOByStatus,
      labels: PO_STATUS_LABELS, tab: poTab, setTab: setPoTab,
      gradient: 'from-slate-800 to-slate-900',
      accent: 'text-amber-400', iconBg: 'bg-amber-500/10',
    },
    {
      title: 'Manufacturing Orders', icon: Factory, href: '/manufacturing-orders',
      allTotal: moTotal, myTotal: myMOTotal,
      allByStatus: moByStatus, myByStatus: myMOByStatus,
      labels: MO_STATUS_LABELS, tab: moTab, setTab: setMoTab,
      gradient: 'from-slate-800 to-slate-900',
      accent: 'text-violet-400', iconBg: 'bg-violet-500/10',
    },
  ];

  return (
    <div>
      {/* ═══ Header ═══ */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-medium text-slate-700">{user?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-700">Live</span>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>
      </div>

      {/* ═══ Dark Cards with All/My Tabs ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {cards.map((card) => {
          const CardIcon = card.icon;
          const activeTab = card.tab;
          const currentTotal = activeTab === 'all' ? card.allTotal : card.myTotal;
          const currentByStatus = activeTab === 'all' ? card.allByStatus : card.myByStatus;

          return (
            <div key={card.title} className={`bg-gradient-to-br ${card.gradient} rounded-xl p-5 text-white relative overflow-hidden`}>
              {/* Decorative bg circle */}
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.03]" />

              {/* Card Header — Title + Icon */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <p className="text-sm font-medium text-slate-300">{card.title}</p>
                <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <CardIcon size={18} className={card.accent} />
                </div>
              </div>

              {/* All / My Tabs */}
              <div className="flex gap-1 mb-4 relative z-10">
                <button
                  onClick={() => card.setTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => card.setTab('my')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === 'my' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  My
                </button>
              </div>

              {/* Count */}
              <div className="relative z-10">
                <p className="text-4xl font-bold tabular-nums">{currentTotal}</p>
              </div>

              {/* Status Pills */}
              <div className="relative z-10">
                {renderStatusPills(currentByStatus, card.labels)}
              </div>

              {/* View Link */}
              <Link href={card.href} className="flex items-center gap-1 mt-5 text-xs text-slate-400 hover:text-white transition-colors relative z-10">
                View details <ChevronRight size={12} />
              </Link>
            </div>
          );
        })}
      </div>

      {/* ═══ Recent Activity / Quick Access ═══ */}
      {stats?.recent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales Orders */}
          {stats.recent.salesOrders && stats.recent.salesOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Recent Sales Orders</h3>
                <Link href="/sales-orders" className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">View all <ArrowRight size={12} /></Link>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.recent.salesOrders.slice(0, 5).map(so => (
                  <Link key={so.id} href={`/sales-orders/${so.id}`} className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{so.so_number}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{(so.customer as { name: string })?.name || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(so.total_amount)}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${so.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : so.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' : so.status === 'FULLY_DELIVERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>{so.status.replace(/_/g, ' ')}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Stock Movements */}
          {stats.recent.stockMovements && stats.recent.stockMovements.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Recent Stock Movements</h3>
                <Link href="/stock-ledger" className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">View all <ArrowRight size={12} /></Link>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.recent.stockMovements.slice(0, 5).map(sm => (
                  <div key={sm.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{sm.product?.name || '—'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{sm.movement_type.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${Number(sm.qty_change) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {Number(sm.qty_change) >= 0 ? '+' : ''}{sm.qty_change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
