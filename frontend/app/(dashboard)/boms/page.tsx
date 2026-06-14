'use client';

import { useEffect, useState } from 'react';
import { bomsApi } from '@/lib/api/client';
import { BillOfMaterials } from '@/types';
import { Search, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function BoMsPage() {
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    bomsApi.getAll({ limit: 100 }).then(r => setBoms(r.data.data || [])).catch(err => console.error('Failed to load BoMs:', err)).finally(() => setLoading(false));
  }, []);

  const filtered = boms.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.bom_reference.toLowerCase().includes(q) || (b.product?.name || '').toLowerCase().includes(q);
  });

  const toggleSelect = (id: string) => { setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleSelectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map(b => b.id))); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Bills of Materials</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product bills of materials templates</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/boms/new" className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800">
            <Plus size={16} /> New Bill of Materials
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by reference or product..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400"><X size={13} /></button>}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-slate-400">Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><p className="text-slate-500 mb-2">{search ? `No BoMs matching "${search}"` : 'No bills of materials yet'}</p><Link href="/boms/new" className="text-sm text-blue-700 hover:underline">Create first BoM →</Link></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-3 w-10"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" /></th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Finished Product</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Quantity</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Unit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bom => (
                  <tr key={bom.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedIds.has(bom.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="py-3 px-3"><input type="checkbox" checked={selectedIds.has(bom.id)} onChange={() => toggleSelect(bom.id)} className="rounded border-slate-300" /></td>
                    <td className="py-3 px-4"><Link href={`/boms/${bom.id}`} className="font-medium text-blue-700 hover:underline">{bom.bom_reference}</Link></td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{bom.product?.name || '—'}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{Number(bom.qty_produced).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center text-slate-500">Units</td>
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
