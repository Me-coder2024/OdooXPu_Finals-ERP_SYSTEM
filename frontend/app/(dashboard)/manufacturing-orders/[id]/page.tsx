'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { manufacturingOrdersApi } from '@/lib/api/client';
import { ManufacturingOrder, WorkOrderStatus } from '@/types';
import { ArrowLeft, Check, Factory, X, Zap, Play, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';

export default function ManufacturingOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [mo, setMo] = useState<ManufacturingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => { fetchMO(); }, [params.id]);

  const fetchMO = async () => {
    try {
      const res = await manufacturingOrdersApi.getById(params.id as string);
      setMo(res.data.data);
    } catch (err) { console.error('Failed to load MO:', err); }
    finally { setLoading(false); }
  };

  const handleAction = async (action: 'confirm' | 'produce' | 'cancel') => {
    setActionLoading(action);
    setMessage({ text: '', type: '' });
    try {
      if (action === 'confirm') await manufacturingOrdersApi.confirm(params.id as string);
      else if (action === 'produce') await manufacturingOrdersApi.produce(params.id as string);
      else await manufacturingOrdersApi.cancel(params.id as string);
      setMessage({ text: `Manufacturing Order ${action}ed successfully.`, type: 'success' });
      await fetchMO();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || `Failed to ${action}`, type: 'error' });
    } finally { setActionLoading(''); }
  };

  const handleWorkOrderUpdate = async (woId: string, status: WorkOrderStatus) => {
    try {
      await manufacturingOrdersApi.updateWorkOrder(params.id as string, woId, { status });
      await fetchMO();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || 'Failed to update work order', type: 'error' });
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading manufacturing order...</div>;
  if (!mo) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Manufacturing order not found</p>
      <Link href="/manufacturing-orders" className="text-blue-700 text-sm mt-2 inline-block">Back to Manufacturing Orders</Link>
    </div>
  );

  const canConfirm = mo.status === 'DRAFT';
  const allWOsDone = mo.work_orders?.every((wo) => wo.status === 'DONE') ?? false;
  const canProduce = (mo.status === 'CONFIRMED' || mo.status === 'IN_PROGRESS') && allWOsDone;
  const canCancel = mo.status === 'DRAFT' || mo.status === 'CONFIRMED';

  const woStatusIcon = (status: WorkOrderStatus) => {
    if (status === 'DONE') return <CheckCircle size={16} className="text-emerald-600" />;
    if (status === 'IN_PROGRESS') return <Play size={16} className="text-amber-600" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  const woStatusBg = (status: WorkOrderStatus) => {
    if (status === 'DONE') return 'bg-emerald-50 border-emerald-200';
    if (status === 'IN_PROGRESS') return 'bg-amber-50 border-amber-200';
    return 'bg-slate-50 border-slate-200';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{mo.mo_number}</h1>
            <StatusBadge status={mo.status} />
            {mo.auto_generated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Zap size={10} /> Auto-generated (MTO)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{mo.product?.name} · Scheduled {formatDate(mo.scheduled_date)}</p>
        </div>
        <div className="flex gap-2">
          {canConfirm && (
            <button onClick={() => handleAction('confirm')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors">
              <Check size={14} /> Confirm
            </button>
          )}
          <button onClick={() => handleAction('produce')} disabled={!!actionLoading || !canProduce}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${canProduce ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            title={!allWOsDone ? 'All work orders must be completed before producing' : ''}>
            <Factory size={14} /> Produce
          </button>
          {canCancel && (
            <button onClick={() => handleAction('cancel')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
              <X size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Produce lock notice */}
      {!allWOsDone && (mo.status === 'CONFIRMED' || mo.status === 'IN_PROGRESS') && (
        <div className="mb-4 p-3 rounded-md text-sm bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-2">
          <Clock size={16} />
          <span><strong>Produce locked</strong> — All work orders must be completed (DONE) before production can begin.</span>
        </div>
      )}

      {/* MO Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Product</p>
          <p className="text-sm font-medium text-slate-900">{mo.product?.name}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">BoM Reference</p>
          <Link href={`/boms/${mo.bom_id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">{mo.bom?.bom_reference}</Link>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Qty to Produce</p>
          <p className="text-xl font-semibold text-slate-900">{mo.qty_to_produce}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Qty Produced</p>
          <p className="text-xl font-semibold text-emerald-700">{mo.qty_produced}</p>
        </div>
      </div>

      {mo.source_so && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <Zap size={18} className="text-amber-600" />
          <span className="text-sm text-amber-800">
            This MO was auto-generated from Sales Order{' '}
            <Link href={`/sales-orders/${mo.source_so_id}`} className="font-medium text-blue-700 hover:text-blue-800">{mo.source_so.so_number}</Link>
          </span>
        </div>
      )}

      {/* Components */}
      {mo.components && mo.components.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Components</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Material</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Required</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Consumed</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Available</th>
                </tr>
              </thead>
              <tbody>
                {mo.components.map((comp) => (
                  <tr key={comp.id} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-900 font-medium">{comp.product?.name}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{comp.required_qty}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{comp.consumed_qty}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${comp.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {comp.is_available ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Work Orders */}
      {mo.work_orders && mo.work_orders.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Work Orders</h2>
          </div>
          <div className="p-4 space-y-3">
            {mo.work_orders
              .sort((a, b) => (a.operation?.sequence_order || 0) - (b.operation?.sequence_order || 0))
              .map((wo, idx) => (
              <div key={wo.id} className={`p-4 rounded-lg border ${woStatusBg(wo.status)} flex items-center gap-4`}>
                <div className="flex items-center gap-3 flex-1">
                  <span className="inline-flex w-7 h-7 items-center justify-center bg-white rounded-full text-xs font-semibold text-slate-600 border border-slate-200">{idx + 1}</span>
                  {woStatusIcon(wo.status)}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{wo.operation?.name || `Work Order ${idx + 1}`}</p>
                    <p className="text-xs text-slate-500">{wo.work_center?.name} · {wo.planned_duration_mins} min planned</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-2.5 py-1 rounded text-xs font-medium ${
                    wo.status === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                    wo.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>{wo.status}</span>
                  {wo.status === 'PENDING' && (
                    <button onClick={() => handleWorkOrderUpdate(wo.id, 'IN_PROGRESS')} className="px-3 py-1.5 bg-blue-700 text-white rounded-md text-xs font-medium hover:bg-blue-800 transition-colors">
                      Start
                    </button>
                  )}
                  {wo.status === 'IN_PROGRESS' && (
                    <button onClick={() => handleWorkOrderUpdate(wo.id, 'DONE')} className="px-3 py-1.5 bg-emerald-700 text-white rounded-md text-xs font-medium hover:bg-emerald-800 transition-colors">
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
