'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function NewManufacturingOrderPage() {
  const router = useRouter();
  const [boms, setBoms] = useState<{ id: string; bom_reference: string; product: { id: string; name: string }; qty_produced: number }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    bom_id: '', qty_to_produce: '1', scheduled_date: new Date().toISOString().split('T')[0], assigned_to: '',
  });

  const selectedBom = boms.find(b => b.id === form.bom_id);

  useEffect(() => {
    apiClient.get('/boms', { params: { limit: 100 } }).then(res => setBoms(res.data.data || [])).catch(() => {});
    apiClient.get('/users', { params: { limit: 100 } }).then(res => setUsers(res.data.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/manufacturing-orders', {
        product_id: selectedBom?.product?.id,
        bom_id: form.bom_id,
        qty_to_produce: Number(form.qty_to_produce),
        scheduled_date: form.scheduled_date,
        assigned_to: form.assigned_to || undefined,
      });
      router.push('/manufacturing-orders');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setError(msg || 'Failed to create MO');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">New Manufacturing Order</h1>
            <p className="text-sm text-slate-500">Create a manufacturing order from a Bill of Materials</p>
          </div>
        </div>
        <Link href="/audit-logs?module=MANUFACTURING" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
          <FileText size={14} /> Logs
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">⚠ {error}</p></div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill of Materials *</label>
              <select value={form.bom_id} onChange={(e) => setForm({ ...form, bom_id: e.target.value })} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select BoM</option>
                {boms.map(b => <option key={b.id} value={b.id}>{b.bom_reference} — {b.product?.name}</option>)}
              </select>
            </div>
            {selectedBom && (
              <div className="flex items-center">
                <div className="bg-blue-50 rounded-lg p-3 w-full">
                  <p className="text-xs text-blue-600 font-medium">Product to Manufacture</p>
                  <p className="text-sm font-semibold text-blue-900 mt-0.5">{selectedBom.product?.name}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Produces {selectedBom.qty_produced} unit(s) per BoM</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity to Produce *</label>
              <input type="number" min="1" value={form.qty_to_produce} onChange={(e) => setForm({ ...form, qty_to_produce: e.target.value })} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Scheduled Date *</label>
              <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Assign To</label>
              <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading || !form.bom_id} className="px-6 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
            {loading ? 'Creating...' : 'Create Manufacturing Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
