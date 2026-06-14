'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { purchaseOrdersApi, productsApi, vendorsApi, usersApi } from '@/lib/api/client';
import { Product, Vendor, User } from '@/types';
import { ArrowLeft, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface OrderLine { product_id: string; ordered_qty: number; unit_cost: number; }

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([{ product_id: '', ordered_qty: 1, unit_cost: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    productsApi.getAll({ limit: 200 }).then(r => setProducts(r.data.data || [])).catch(() => {});
    vendorsApi.getAll({ limit: 200 }).then(r => setVendors(r.data.data || [])).catch(() => {});
    usersApi.getAll({ limit: 100 }).then(r => setUsers(r.data.data || [])).catch(() => {});
  }, []);

  const selectedVendor = vendors.find(v => v.id === vendorId);
  const addLine = () => setLines([...lines, { product_id: '', ordered_qty: 1, unit_cost: 0 }]);
  const removeLine = (idx: number) => { if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx)); };
  const updateLine = (idx: number, field: keyof OrderLine, value: string | number) => {
    const updated = [...lines];
    if (field === 'product_id') { updated[idx].product_id = value as string; const p = products.find(pr => pr.id === value); if (p) updated[idx].unit_cost = Number(p.cost_price); }
    else if (field === 'ordered_qty') updated[idx].ordered_qty = Number(value);
    else if (field === 'unit_cost') updated[idx].unit_cost = Number(value);
    setLines(updated);
  };

  const total = lines.reduce((s, l) => s + l.ordered_qty * l.unit_cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const validLines = lines.filter(l => l.product_id && l.ordered_qty > 0);
      if (validLines.length === 0) { setError('Add at least one line'); setLoading(false); return; }
      await purchaseOrdersApi.create({ vendor_id: vendorId, order_date: orderDate, expected_date: expectedDate || undefined, notes: notes || undefined, lines: validLines });
      router.push('/purchase-orders');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setError(msg || 'Failed to create purchase order');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/purchase-orders')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"><ArrowLeft size={15} /> Back</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Status: Draft</span>
            <Link href="/audit-logs?module=PURCHASE" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"><FileText size={14} /> Logs</Link>
          </div>
        </div>

        {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ {error}</div>}

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-300 font-mono tracking-tight">PO-XXXXX</h1>
            <p className="text-xs text-slate-400 italic mt-0.5">Auto-generated on save</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Vendor *</label>
                <select value={vendorId} onChange={e => setVendorId(e.target.value)} required className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Select vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Vendor Address</label>
                <p className="flex-1 text-sm text-slate-700 border-b border-slate-200 pb-1">{selectedVendor?.address || '—'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Creation Date</label>
                <p className="flex-1 text-sm text-slate-700 border-b border-slate-200 pb-2 bg-slate-50 px-3 py-1.5 rounded">
                  {new Date(orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Responsible Person</label>
                <select className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500" disabled>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 w-[35%]">Products</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Ordered Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Received Quantity</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Units</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Cost Unit Price</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Total</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 px-4">
                      <select value={line.product_id} onChange={e => updateLine(idx, 'product_id', e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-4"><input type="number" min="1" value={line.ordered_qty} onChange={e => updateLine(idx, 'ordered_qty', e.target.value)} className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></td>
                    <td className="py-2 px-4 text-right text-slate-300 tabular-nums">0</td>
                    <td className="py-2 px-4 text-center text-slate-500">Units</td>
                    <td className="py-2 px-4"><input type="number" min="0" step="0.01" value={line.unit_cost} onChange={e => updateLine(idx, 'unit_cost', e.target.value)} className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></td>
                    <td className="py-2 px-4 text-right font-medium text-slate-900 tabular-nums">{formatCurrency(line.ordered_qty * line.unit_cost)}</td>
                    <td className="py-2 px-4"><button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1} className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded hover:bg-red-50"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200"><td colSpan={7} className="py-2 px-4"><button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"><Plus size={14} /> Add a product</button></td></tr>
                <tr className="border-t-2 border-slate-200 bg-slate-50/70"><td colSpan={5} className="py-3 px-4 text-right font-semibold text-slate-700">Total</td><td className="py-3 px-4 text-right font-bold text-lg text-slate-900 tabular-nums">{formatCurrency(total)}</td><td /></tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push('/purchase-orders')} className="px-5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />}{loading ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
