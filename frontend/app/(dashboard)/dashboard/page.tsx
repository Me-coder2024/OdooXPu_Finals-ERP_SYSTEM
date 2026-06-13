'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/client';
import { DashboardStats } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Package, ShoppingCart, Truck, Factory, AlertTriangle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await dashboardApi.getStats();
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your ERP operations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-5 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Products', value: stats?.overview.totalProducts || 0, icon: Package, color: 'text-blue-700', bg: 'bg-blue-50' },
    { title: 'Sales Orders', value: stats?.salesOrders.total || 0, icon: ShoppingCart, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { title: 'Purchase Orders', value: stats?.purchaseOrders.total || 0, icon: Truck, color: 'text-amber-700', bg: 'bg-amber-50' },
    { title: 'Manufacturing Orders', value: stats?.manufacturingOrders.total || 0, icon: Factory, color: 'text-violet-700', bg: 'bg-violet-50' },
  ];

  const soByStatus = stats?.salesOrders.byStatus || {};
  const poByStatus = stats?.purchaseOrders.byStatus || {};
  const moByStatus = stats?.manufacturingOrders.byStatus || {};

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-200',
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
        <h3 className="text-sm font-medium text-slate-700 mb-3">{label}</h3>
        <div className="space-y-2">
          {Object.entries(data).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-36 truncate">{status.replace(/_/g, ' ')}</span>
              <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${statusColors[status] || 'bg-slate-400'}`}
                  style={{ width: `${(count / total) * 100}%`, minWidth: count > 0 ? '8px' : '0' }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your ERP operations</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={18} className={card.color} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Card */}
      {stats?.overview.totalRevenue !== undefined && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Revenue (Delivered SOs)</p>
            <p className="text-xl font-semibold text-slate-900">{formatCurrency(stats.overview.totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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

      {/* Low Stock Alerts */}
      {stats?.alerts.lowStockProducts && stats.alerts.lowStockProducts.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Low Stock Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Product</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">SKU</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">On Hand</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">Reserved</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">Free</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">Min Stock</th>
                </tr>
              </thead>
              <tbody>
                {stats.alerts.lowStockProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-900">{p.name}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-xs">{p.sku}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{p.on_hand_qty}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{p.reserved_qty}</td>
                    <td className="py-2 px-3 text-right font-medium text-amber-700">{p.free_to_use_qty}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{p.min_stock_qty}</td>
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
