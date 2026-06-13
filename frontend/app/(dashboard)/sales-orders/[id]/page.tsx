'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { salesOrdersApi } from '@/lib/api/client';
import { SalesOrder } from '@/types';
import { ArrowLeft, Check, Truck, X, Zap } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      const res = await salesOrdersApi.getById(params.id as string);
      setOrder(res.data.data);
    } catch (err) {
      console.error('Failed to load SO:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'confirm' | 'deliver' | 'cancel') => {
    setActionLoading(action);
    setMessage({ text: '', type: '' });
    try {
      if (action === 'confirm') {
        await salesOrdersApi.confirm(params.id as string);
        setMessage({ text: 'Sales Order confirmed! Stock reserved and MTO procurement triggered if applicable.', type: 'success' });
      } else if (action === 'deliver') {
        await salesOrdersApi.deliver(params.id as string, {});
        setMessage({ text: 'Sales Order marked as delivered.', type: 'success' });
      } else if (action === 'cancel') {
        await salesOrdersApi.cancel(params.id as string);
        setMessage({ text: 'Sales Order cancelled. Stock unreserved.', type: 'success' });
      }
      await fetchOrder();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || `Failed to ${action} order`, type: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading sales order...</div>;
  if (!order) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Sales order not found</p>
      <Link href="/sales-orders" className="text-blue-700 text-sm mt-2 inline-block">Back to Sales Orders</Link>
    </div>
  );

  const canConfirm = order.status === 'DRAFT';
  const canDeliver = order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DELIVERED';
  const canCancel = order.status === 'DRAFT' || order.status === 'CONFIRMED';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{order.so_number}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-500">{order.customer?.name} · {formatDate(order.order_date)}</p>
        </div>
        <div className="flex gap-2">
          {canConfirm && (
            <button onClick={() => handleAction('confirm')} disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors">
              <Check size={14} /> Confirm
            </button>
          )}
          {canDeliver && (
            <button onClick={() => handleAction('deliver')} disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 transition-colors">
              <Truck size={14} /> Deliver
            </button>
          )}
          {canCancel && (
            <button onClick={() => handleAction('cancel')} disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
              <X size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Order Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="text-slate-900 font-medium">{order.customer?.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Order Date</span><span className="text-slate-700">{formatDate(order.order_date)}</span></div>
            {order.expected_delivery && <div className="flex justify-between"><span className="text-slate-500">Expected Delivery</span><span className="text-slate-700">{formatDate(order.expected_delivery)}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Created By</span><span className="text-slate-700">{order.creator?.name}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Financial Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total Amount</span><span className="text-xl font-semibold text-slate-900">{formatCurrency(order.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Line Items</span><span className="text-slate-700">{order.lines?.length || 0}</span></div>
          </div>
        </div>
        {order.notes && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Notes</h2>
            <p className="text-sm text-slate-600">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Order Lines */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Order Lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Ordered</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Delivered</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Unit Price</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Subtotal</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Reserved</th>
              </tr>
            </thead>
            <tbody>
              {order.lines?.map((line) => (
                <tr key={line.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-900 font-medium">{line.product?.name || '—'}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{line.ordered_qty}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{line.delivered_qty}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(line.unit_price)}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900">{formatCurrency(line.subtotal)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${line.reserved ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {line.reserved ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-generated POs/MOs from MTO */}
      {order.triggered_pos && order.triggered_pos.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Zap size={16} className="text-amber-600" />
            <h2 className="text-base font-semibold text-slate-900">Auto-Generated Purchase Orders (MTO)</h2>
          </div>
          <div className="p-4 space-y-2">
            {order.triggered_pos.map((po) => (
              <div key={po.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                <Link href={`/purchase-orders/${po.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">{po.po_number}</Link>
                <StatusBadge status={po.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {order.triggered_mos && order.triggered_mos.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Zap size={16} className="text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">Auto-Generated Manufacturing Orders (MTO)</h2>
          </div>
          <div className="p-4 space-y-2">
            {order.triggered_mos.map((mo) => (
              <div key={mo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                <Link href={`/manufacturing-orders/${mo.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">{mo.mo_number}</Link>
                <StatusBadge status={mo.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
