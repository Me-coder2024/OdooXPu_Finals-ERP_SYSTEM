'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { purchaseOrdersApi } from '@/lib/api/client';
import { PurchaseOrder } from '@/types';
import { ArrowLeft, Check, Package, X, FileText, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  const fetchOrder = useCallback(async () => {
    try {
      const res = await purchaseOrdersApi.getById(params.id as string);
      setOrder(res.data.data);
      const qtys: Record<string, number> = {};
      (res.data.data.lines || []).forEach((l: { id: string; received_qty: number }) => { qtys[l.id] = Number(l.received_qty); });
      setReceiveQtys(qtys);
    } catch (err) { console.error('Failed to load PO:', err); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleAction = async (action: 'confirm' | 'receive' | 'cancel') => {
    setActionLoading(action);
    setMessage({ text: '', type: '' });
    try {
      if (action === 'confirm') {
        await purchaseOrdersApi.confirm(params.id as string);
        setMessage({ text: 'Purchase Order confirmed.', type: 'success' });
      } else if (action === 'receive') {
        await purchaseOrdersApi.receive(params.id as string, { lines: receiveQtys });
        setMessage({ text: 'Receipt recorded successfully.', type: 'success' });
      } else if (action === 'cancel') {
        await purchaseOrdersApi.cancel(params.id as string);
        setMessage({ text: 'Purchase Order cancelled.', type: 'success' });
      }
      await fetchOrder();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || `Failed to ${action} order`, type: 'error' });
    } finally { setActionLoading(''); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /><span className="ml-2 text-slate-500 text-sm">Loading...</span></div>;
  if (!order) return <div className="p-8 text-center"><p className="text-slate-500">Purchase order not found</p><Link href="/purchase-orders" className="text-blue-700 text-sm mt-2 inline-block">Back</Link></div>;

  const isDraft = order.status === 'DRAFT';
  const isConfirmed = order.status === 'CONFIRMED';
  const isPartiallyReceived = order.status === 'PARTIALLY_RECEIVED';
  const isFullyReceived = order.status === 'FULLY_RECEIVED';
  const isCancelled = order.status === 'CANCELLED';
  const canConfirm = isDraft;
  const canReceive = isConfirmed || isPartiallyReceived;
  const canCancel = isDraft || isConfirmed;
  const receiveEditable = canReceive;

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200', CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
      PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-700 border-amber-200', FULLY_RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return m[s] || m.DRAFT;
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Action Bar — Back | Confirm | Received | Cancel ... Logs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/purchase-orders')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            {canConfirm && (
              <button onClick={() => handleAction('confirm')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors">
                {actionLoading === 'confirm' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
              </button>
            )}
            {canReceive && (
              <button onClick={() => handleAction('receive')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 transition-colors">
                {actionLoading === 'receive' ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />} Received
              </button>
            )}
            {canCancel && (
              <button onClick={() => handleAction('cancel')} disabled={!!actionLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors">
                {actionLoading === 'cancel' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Cancel
              </button>
            )}
          </div>
          <Link href="/audit-logs?module=PURCHASE" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
            <FileText size={14} /> Logs
          </Link>
        </div>

        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
        )}

        <div className="p-6">
          {/* PO# + Status */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{order.po_number}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(order.status)}`}>
              Status: {order.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Vendor</label>
                <p className="text-sm text-slate-900 font-medium flex-1 border-b border-slate-200 pb-1">{order.vendor?.name || '—'}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Vendor Address</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">{order.vendor?.address || '—'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Creation Date</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">{formatDateTime(order.order_date)}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Responsible Person</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">—</p>
              </div>
            </div>
          </div>

          {/* Lines Table — Products, Ordered Qty, Received Qty, Units, Cost Unit Price, Total */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Products</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Ordered Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Received Quantity</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Units</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Cost Unit Price</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lines?.map((line) => {
                  const orderedQty = Number(line.ordered_qty);
                  const receivedQty = receiveQtys[line.id] ?? Number(line.received_qty);
                  const unitCost = Number(line.unit_cost);
                  return (
                    <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-slate-900 font-medium">{line.product?.name || '—'}</p>
                        {line.product?.sku && <p className="text-[11px] text-slate-400 font-mono">{line.product.sku}</p>}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{orderedQty}</td>
                      <td className="py-3 px-4 text-right">
                        {receiveEditable ? (
                          <input type="number" min="0" max={orderedQty} value={receivedQty}
                            onChange={(e) => setReceiveQtys({ ...receiveQtys, [line.id]: Number(e.target.value) })}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 tabular-nums" />
                        ) : (
                          <span className={`tabular-nums ${receivedQty >= orderedQty ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}>{receivedQty}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">Units</td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{formatCurrency(unitCost)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">{formatCurrency(orderedQty * unitCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                  <td colSpan={5} className="py-3 px-4 text-right font-semibold text-slate-700">Total</td>
                  <td className="py-3 px-4 text-right font-bold text-lg text-slate-900 tabular-nums">{formatCurrency(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.source_so && (
            <div className="mt-6 flex items-baseline gap-4">
              <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Source Sales Order</label>
              <Link href={`/sales-orders/${order.source_so.id}`} className="text-sm text-blue-700 hover:underline">{order.source_so.so_number}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
