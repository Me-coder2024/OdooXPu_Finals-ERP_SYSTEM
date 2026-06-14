'use client';

import { useEffect, useState, useCallback } from 'react';
import { manufacturingOrdersApi } from '@/lib/api/client';
import { ManufacturingOrder, OrderStatus } from '@/types';
import { Plus, Search, LayoutList, LayoutGrid, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';

const STATUS_OPTIONS: (OrderStatus | 'ALL')[] = ['ALL', 'DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const KANBAN_COLUMNS: OrderStatus[] = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DONE'];

export default function ManufacturingOrdersPage() {
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 50 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await manufacturingOrdersApi.getAll(params as { page: number; limit: number; status?: string });
      setOrders(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalCount(res.data.pagination?.total || 0);
    } catch (err) { console.error('Failed to load MOs:', err); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.mo_number.toLowerCase().includes(q) || (o.product?.name || '').toLowerCase().includes(q);
  });

  const toggleSelect = (id: string) => { setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleSelectAll = () => { if (selectedIds.size === filteredOrders.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredOrders.map(o => o.id))); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Manufacturing Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage production and manufacturing workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button className="p-2 rounded-md text-slate-400 hover:text-slate-600"><Search size={16} /></button>
            <div className="w-px h-4 bg-slate-300" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><LayoutList size={16} /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md ${viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}><LayoutGrid size={16} /></button>
          </div>
          <Link href="/manufacturing-orders/new" className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800">
            <Plus size={16} /> New Manufacturing Orders
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by reference or product..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400"><X size={13} /></button>}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-slate-400">Loading...</p></div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><p className="text-slate-500 mb-2">{search ? `No orders matching "${search}"` : 'No manufacturing orders'}</p></div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-3 w-10"><input type="checkbox" checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" /></th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Finished Product</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Resource Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Quantity</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Unit</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  // Resource status: check if all components are available
                  const allAvailable = order.components?.every(c => c.is_available) ?? true;
                  return (
                    <tr key={order.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedIds.has(order.id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="py-3 px-3"><input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded border-slate-300" /></td>
                      <td className="py-3 px-4">
                        <Link href={`/manufacturing-orders/${order.id}`} className="font-medium text-blue-700 hover:underline">{order.mo_number}</Link>
                        {order.auto_generated && <Zap size={12} className="inline ml-1 text-amber-500" />}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(order.scheduled_date)}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{order.product?.name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${allAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {allAvailable ? 'Available' : 'Short'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{Number(order.qty_to_produce).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-slate-500">Units</td>
                      <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">Page {page} of {totalPages} ({totalCount} total)</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={14} /> Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map(colStatus => {
            const colOrders = filteredOrders.filter(o => o.status === colStatus);
            return (
              <div key={colStatus} className="bg-slate-100 rounded-xl p-3 min-h-[300px]">
                <div className="flex items-center justify-between mb-3 px-1"><StatusBadge status={colStatus} /><span className="text-xs text-slate-500">({colOrders.length})</span></div>
                <div className="space-y-2">
                  {colOrders.map(o => (
                    <Link key={o.id} href={`/manufacturing-orders/${o.id}`} className="block bg-white rounded-lg border border-slate-200 p-3.5 hover:shadow-md hover:border-blue-200 transition-all">
                      <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-blue-700">{o.mo_number}</span></div>
                      <p className="text-sm text-slate-700 font-medium">{o.product?.name || '—'}</p>
                      <div className="flex items-center justify-between mt-2"><span className="text-xs text-slate-400">{formatDate(o.scheduled_date)}</span><span className="text-xs font-medium">{Number(o.qty_to_produce)} units</span></div>
                    </Link>
                  ))}
                  {colOrders.length === 0 && <div className="text-center py-8 text-xs text-slate-400">No orders</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
