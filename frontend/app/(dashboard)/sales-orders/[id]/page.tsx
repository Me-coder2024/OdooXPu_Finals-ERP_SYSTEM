'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { salesOrdersApi } from '@/lib/api/client';
import { SalesOrder } from '@/types';
import { ArrowLeft, Check, Truck, X, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  // Delivery qty overrides (only used when status allows editing)
  const [deliveryQtys, setDeliveryQtys] = useState<Record<string, number>>({});

  const fetchOrder = useCallback(async () => {
    try {
      const res = await salesOrdersApi.getById(params.id as string);
      setOrder(res.data.data);
      // Initialize delivery qty fields from current values
      const qtys: Record<string, number> = {};
      (res.data.data.lines || []).forEach((l: { id: string; delivered_qty: number }) => {
        qtys[l.id] = Number(l.delivered_qty);
      });
      setDeliveryQtys(qtys);
    } catch (err) {
      console.error('Failed to load SO:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleAction = async (action: 'confirm' | 'deliver' | 'cancel') => {
    setActionLoading(action);
    setMessage({ text: '', type: '' });
    try {
      if (action === 'confirm') {
        const res = await salesOrdersApi.confirm(params.id as string);
        const pos = res.data.meta?.auto_created_pos || [];
        const mos = res.data.meta?.auto_created_mos || [];
        let msg = 'Order confirmed! Stock reserved.';
        if (pos.length > 0) msg += ` Auto-created Purchase Orders: ${pos.join(', ')}.`;
        if (mos.length > 0) msg += ` Auto-created Manufacturing Orders: ${mos.join(', ')}.`;
        setMessage({ text: msg, type: 'success' });
      } else if (action === 'deliver') {
        // Pass delivery qtys to backend
        await salesOrdersApi.deliver(params.id as string, { lines: deliveryQtys });
        setMessage({ text: 'Delivery recorded successfully.', type: 'success' });
      } else if (action === 'cancel') {
        await salesOrdersApi.cancel(params.id as string);
        setMessage({ text: 'Order cancelled. Stock unreserved.', type: 'success' });
      }
      await fetchOrder();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || `Failed to ${action} order`, type: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="ml-2 text-slate-500 text-sm">Loading sales order...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Sales order not found</p>
        <Link href="/sales-orders" className="text-blue-700 text-sm mt-2 inline-block">Back to Sales Orders</Link>
      </div>
    );
  }

  // Status-based readonly/visibility logic per breakdown
  const isDraft = order.status === 'DRAFT';
  const isConfirmed = order.status === 'CONFIRMED';
  const isPartiallyDelivered = order.status === 'PARTIALLY_DELIVERED';
  const isFullyDelivered = order.status === 'FULLY_DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  const canConfirm = isDraft;
  const canDeliver = isConfirmed || isPartiallyDelivered;
  const canCancel = isDraft || isConfirmed;
  // Fields readonly after confirm
  const fieldsReadonly = !isDraft;
  // Delivered qty editable only when confirmed/partially delivered
  const deliveredQtyEditable = canDeliver;
  // All fields readonly when fully delivered or cancelled
  const allReadonly = isFullyDelivered || isCancelled;

  // Status badge
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
      PARTIALLY_DELIVERED: 'bg-amber-50 text-amber-700 border-amber-200',
      FULLY_DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status] || map.DRAFT;
  };

  return (
    <div>
      {/* ═══ Form Card ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Top Action Bar — matches wireframe: Back | Confirm | Deliver | Cancel | Logs ── */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push('/sales-orders')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            {canConfirm && (
              <button
                onClick={() => handleAction('confirm')}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'confirm' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm
              </button>
            )}
            {canDeliver && (
              <button
                onClick={() => handleAction('deliver')}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'deliver' ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                Deliver
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => handleAction('cancel')}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'cancel' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Cancel
              </button>
            )}
          </div>
          <Link
            href={`/audit-logs?module=SALES`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
          >
            <FileText size={14} /> Logs
          </Link>
        </div>

        {/* ── Status message ── */}
        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>{message.text}</div>
        )}

        {/* ═══ Form Body ═══ */}
        <div className="p-6">
          {/* SO Number + Status */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{order.so_number}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(order.status)}`}>
              Status: {order.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* ── Form Fields Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            {/* Left column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Customer</label>
                <p className="text-sm text-slate-900 font-medium flex-1 border-b border-slate-200 pb-1">
                  {order.customer?.name || '—'}
                </p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Customer Address</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">
                  {order.customer?.address || '—'}
                </p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Creation Date</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">
                  {formatDateTime(order.order_date)}
                </p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Sales Person</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">
                  {order.creator?.name || '—'}
                </p>
              </div>
              {order.expected_delivery && (
                <div className="flex items-baseline gap-4">
                  <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Expected Delivery</label>
                  <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">
                    {formatDate(order.expected_delivery)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ═══ Order Lines Table — Products, Ordered Qty, Delivered Qty, Sales Price, Total, Availability ═══ */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Products</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Ordered Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Delivered Qty</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Sales Price</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Total</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Availability</th>
                </tr>
              </thead>
              <tbody>
                {order.lines?.map((line) => {
                  const orderedQty = Number(line.ordered_qty);
                  const deliveredQty = deliveryQtys[line.id] ?? Number(line.delivered_qty);
                  const unitPrice = Number(line.unit_price);
                  // Total = delivered_qty * price if delivered, else ordered_qty * price
                  const lineTotal = isFullyDelivered || isPartiallyDelivered
                    ? deliveredQty * unitPrice
                    : orderedQty * unitPrice;
                  // Availability: check if ordered > free_to_use
                  const freeQty = line.product?.free_to_use_qty ?? (Number(line.product?.on_hand_qty || 0) - Number(line.product?.reserved_qty || 0));
                  const isAvailable = orderedQty <= freeQty;

                  return (
                    <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-slate-900 font-medium">{line.product?.name || '—'}</p>
                        {line.product?.sku && <p className="text-[11px] text-slate-400 font-mono">{line.product.sku}</p>}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{orderedQty}</td>
                      <td className="py-3 px-4 text-right">
                        {deliveredQtyEditable && !allReadonly ? (
                          <input
                            type="number"
                            min="0"
                            max={orderedQty}
                            value={deliveredQty}
                            onChange={(e) => setDeliveryQtys({ ...deliveryQtys, [line.id]: Number(e.target.value) })}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tabular-nums"
                          />
                        ) : (
                          <span className={`tabular-nums ${deliveredQty >= orderedQty ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}>
                            {deliveredQty}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{formatCurrency(unitPrice)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">{formatCurrency(lineTotal)}</td>
                      <td className="py-3 px-4 text-center">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                            <Check size={12} /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                  <td colSpan={4} className="py-3 px-4 text-right font-semibold text-slate-700">Total</td>
                  <td className="py-3 px-4 text-right font-bold text-lg text-slate-900 tabular-nums">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mt-6 flex items-baseline gap-4">
              <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Notes</label>
              <p className="text-sm text-slate-600 flex-1 border-b border-slate-200 pb-1">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MTO Triggered Orders ═══ */}
      {order.triggered_pos && order.triggered_pos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mt-6 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Auto-Generated Purchase Orders (MTO)</h2>
            <span className="ml-auto text-xs text-slate-400">{order.triggered_pos.length} order(s)</span>
          </div>
          <div className="p-4 space-y-2">
            {order.triggered_pos.map((po) => (
              <div key={po.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Link href={`/purchase-orders/${po.id}`} className="text-sm font-medium text-blue-700 hover:underline">{po.po_number}</Link>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(po.status)}`}>{po.status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {order.triggered_mos && order.triggered_mos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mt-4 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Auto-Generated Manufacturing Orders (MTO)</h2>
            <span className="ml-auto text-xs text-slate-400">{order.triggered_mos.length} order(s)</span>
          </div>
          <div className="p-4 space-y-2">
            {order.triggered_mos.map((mo) => (
              <div key={mo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Link href={`/manufacturing-orders/${mo.id}`} className="text-sm font-medium text-blue-700 hover:underline">{mo.mo_number}</Link>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(mo.status)}`}>{mo.status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
