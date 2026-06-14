'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { manufacturingOrdersApi } from '@/lib/api/client';
import { ManufacturingOrder } from '@/types';
import { ArrowLeft, Check, Play, X, FileText, Loader2, Package } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function ManufacturingOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<ManufacturingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState<'components' | 'workorders'>('components');

  const fetchOrder = useCallback(async () => {
    try { const res = await manufacturingOrdersApi.getById(params.id as string); setOrder(res.data.data); }
    catch (err) { console.error('Failed to load MO:', err); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleAction = async (action: 'confirm' | 'produce' | 'cancel') => {
    setActionLoading(action); setMessage({ text: '', type: '' });
    try {
      if (action === 'confirm') {
        const res = await manufacturingOrdersApi.confirm(params.id as string);
        const pos = res.data.autoCreatedPOs || [];
        const mos = res.data.autoCreatedMOs || [];
        let msg = 'Manufacturing Order confirmed.';
        if (pos.length > 0) msg += ` Auto-created Purchase Orders: ${pos.join(', ')}.`;
        if (mos.length > 0) msg += ` Auto-created Manufacturing Orders: ${mos.join(', ')}.`;
        setMessage({ text: msg, type: 'success' });
      }
      else if (action === 'produce') { await manufacturingOrdersApi.produce(params.id as string); setMessage({ text: 'Production completed.', type: 'success' }); }
      else if (action === 'cancel') { await manufacturingOrdersApi.cancel(params.id as string); setMessage({ text: 'Manufacturing Order cancelled.', type: 'success' }); }
      await fetchOrder();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || `Failed to ${action}`, type: 'error' });
    } finally { setActionLoading(''); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /><span className="ml-2 text-slate-500 text-sm">Loading...</span></div>;
  if (!order) return <div className="p-8 text-center"><p className="text-slate-500">Manufacturing order not found</p><Link href="/manufacturing-orders" className="text-blue-700 text-sm mt-2 inline-block">Back</Link></div>;

  const isDraft = order.status === 'DRAFT';
  const isConfirmed = order.status === 'CONFIRMED';
  const isInProgress = order.status === 'IN_PROGRESS';
  const canConfirm = isDraft;
  const canProduce = isConfirmed || isInProgress;
  const canCancel = isDraft || isConfirmed;

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { DRAFT: 'bg-slate-100 text-slate-700 border-slate-200', CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200', IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200', DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200', CANCELLED: 'bg-red-50 text-red-700 border-red-200' };
    return m[s] || m.DRAFT;
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Action Bar — Confirm | Produce | Start | Cancel | Back ... Logs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/manufacturing-orders')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            {canConfirm && (
              <button onClick={() => handleAction('confirm')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50">
                {actionLoading === 'confirm' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
              </button>
            )}
            {canProduce && (
              <button onClick={() => handleAction('produce')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50">
                {actionLoading === 'produce' ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />} Produce
              </button>
            )}
            {isConfirmed && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700">
                <Play size={14} /> Start
              </button>
            )}
            {canCancel && (
              <button onClick={() => handleAction('cancel')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50">
                {actionLoading === 'cancel' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Cancel
              </button>
            )}
          </div>
          <Link href="/audit-logs?module=MANUFACTURING" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100">
            <FileText size={14} /> Logs
          </Link>
        </div>

        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
        )}

        <div className="p-6">
          {/* MO# + Status */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{order.mo_number}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(order.status)}`}>
              Status: {order.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Finished Product</label>
                <p className="text-sm text-slate-900 font-medium flex-1 border-b border-slate-200 pb-1">{order.product?.name || '—'}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Quantity</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1 tabular-nums">{Number(order.qty_to_produce)} Units</p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Bill of Material</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">
                  {order.bom ? <Link href={`/boms/${order.bom.id}`} className="text-blue-700 hover:underline">{order.bom.bom_reference}</Link> : '—'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Schedule Date</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">{formatDate(order.scheduled_date)}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Assignee</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">{order.assignee?.name || '—'}</p>
              </div>
              {order.source_so && (
                <div className="flex items-baseline gap-4">
                  <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Source SO</label>
                  <Link href={`/sales-orders/${order.source_so.id}`} className="text-sm text-blue-700 hover:underline flex-1 border-b border-slate-200 pb-1">{order.source_so.so_number}</Link>
                </div>
              )}
            </div>
          </div>

          {/* Tabs: Components | Work Orders */}
          <div className="border-b border-slate-200 mb-4">
            <div className="flex gap-6">
              <button onClick={() => setActiveTab('components')} className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'components' ? 'text-slate-900 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Components</button>
              <button onClick={() => setActiveTab('workorders')} className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'workorders' ? 'text-slate-900 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Work Orders</button>
            </div>
          </div>

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Raw/Components</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Availability</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">To Consume</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Units</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Consumed</th>
                  </tr>
                </thead>
                <tbody>
                  {order.components?.map(comp => (
                    <tr key={comp.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-900 font-medium">{comp.product?.name || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${comp.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {comp.is_available ? 'Available' : 'Short'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">{Number(comp.required_qty).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-slate-500">Units</td>
                      <td className="py-3 px-4 text-right tabular-nums">{Number(comp.consumed_qty).toFixed(2)}</td>
                    </tr>
                  ))}
                  {(!order.components || order.components.length === 0) && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-sm">No components</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Work Orders Tab */}
          {activeTab === 'workorders' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Operation</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Work Center</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Duration (min)</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Real Duration</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {order.work_orders?.sort((a, b) => (a.operation?.sequence_order || 0) - (b.operation?.sequence_order || 0)).map(wo => (
                    <tr key={wo.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-900 font-medium">{wo.operation?.name || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{wo.work_center?.name || '—'}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{wo.planned_duration_mins}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{wo.actual_duration_mins ?? '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          wo.status === 'DONE' ? 'bg-emerald-50 text-emerald-700' : wo.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>{wo.status}</span>
                      </td>
                    </tr>
                  ))}
                  {(!order.work_orders || order.work_orders.length === 0) && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-sm">No work orders</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Auto-Generated Purchase Orders (Cascading Procurement) ── */}
          {(order as any).triggered_pos?.length > 0 && (
            <div className="mt-6 border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-200 bg-blue-50">
                <h3 className="text-sm font-semibold text-blue-800">⚡ Auto-Generated Purchase Orders</h3>
                <p className="text-xs text-blue-600 mt-0.5">Created automatically for component shortages during MO confirmation</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50/60 border-b border-blue-200">
                    <th className="text-left py-2.5 px-4 font-medium text-blue-700">PO Number</th>
                    <th className="text-center py-2.5 px-4 font-medium text-blue-700">Status</th>
                    <th className="text-right py-2.5 px-4 font-medium text-blue-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(order as any).triggered_pos.map((po: any) => (
                    <tr key={po.id} className="border-b border-blue-100">
                      <td className="py-2.5 px-4 text-slate-900 font-mono font-medium">{po.po_number}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          po.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                          po.status === 'FULLY_RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{po.status.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link href={`/purchase-orders/${po.id}`} className="text-xs text-blue-700 hover:underline font-medium">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
