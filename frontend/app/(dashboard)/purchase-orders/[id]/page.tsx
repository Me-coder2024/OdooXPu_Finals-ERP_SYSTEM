'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { purchaseOrdersApi } from '@/lib/api/client';
import { PurchaseOrder } from '@/types';
import { ArrowLeft, Check, Package, X, Zap } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => { fetchOrder(); }, [params.id]);

  const fetchOrder = async () => {
    try {
      const res = await purchaseOrdersApi.getById(params.id as string);
      setOrder(res.data.data);
    } catch (err) { console.error('Failed to load PO:', err); }
    finally { setLoading(false); }
  };

  const handleAction = async (action: 'confirm' | 'receive' | 'cancel') => {
    setActionLoading(action);
    setMessage({ text: '', type: '' });
    try {
      if (action === 'confirm') await purchaseOrdersApi.confirm(params.id as string);
      else if (action === 'receive') await purchaseOrdersApi.receive(params.id as string, {});
      else await purchaseOrdersApi.cancel(params.id as string);
      setMessage({ text: `Purchase Order ${action}ed successfully.`, type: 'success' });
      await fetchOrder();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || `Failed to ${action}`, type: 'error' });
    } finally { setActionLoading(''); }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading purchase order...</div>;
  if (!order) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Purchase order not found</p>
      <Link href="/purchase-orders" className="text-blue-700 text-sm mt-2 inline-block">Back to Purchase Orders</Link>
    </div>
  );

  const canConfirm = order.status === 'DRAFT';
  const canReceive = order.status === 'CONFIRMED' || order.status === 'PARTIALLY_RECEIVED';
  const canCancel = order.status === 'DRAFT' || order.status === 'CONFIRMED';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{order.po_number}</h1>
            <StatusBadge status={order.status} />
            {order.auto_generated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Zap size={10} /> Auto-generated (MTO)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{order.vendor?.name} · {formatDate(order.order_date)}</p>
        </div>
        <div className="flex gap-2">
          {canConfirm && (
            <button onClick={() => handleAction('confirm')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors">
              <Check size={14} /> Confirm
            </button>
          )}
          {canReceive && (
            <button onClick={() => handleAction('receive')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 transition-colors">
              <Package size={14} /> Receive
            </button>
          )}
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

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Vendor Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Vendor</span><span className="text-slate-900 font-medium">{order.vendor?.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Order Date</span><span className="text-slate-700">{formatDate(order.order_date)}</span></div>
            {order.expected_date && <div className="flex justify-between"><span className="text-slate-500">Expected Date</span><span className="text-slate-700">{formatDate(order.expected_date)}</span></div>}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Financial</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total Amount</span><span className="text-xl font-semibold text-slate-900">{formatCurrency(order.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Line Items</span><span className="text-slate-700">{order.lines?.length || 0}</span></div>
          </div>
        </div>
        {order.source_so && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Source</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Source SO</span>
                <Link href={`/sales-orders/${order.source_so_id}`} className="text-blue-700 font-medium hover:text-blue-800">{order.source_so.so_number}</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PO Lines */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200"><h2 className="text-base font-semibold text-slate-900">Order Lines</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Ordered</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Received</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Unit Cost</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.lines?.map((line) => (
                <tr key={line.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-900 font-medium">{line.product?.name || '—'}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{line.ordered_qty}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{line.received_qty}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(line.unit_cost)}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900">{formatCurrency(line.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
