'use client';

import { useEffect, useState } from 'react';
import { bomsApi } from '@/lib/api/client';
import { BillOfMaterials } from '@/types';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

export default function BoMsPage() {
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBoms = async () => {
      try {
        const res = await bomsApi.getAll({ limit: 100 });
        setBoms(res.data.data || []);
      } catch (err) { console.error('Failed to load BoMs:', err); }
      finally { setLoading(false); }
    };
    fetchBoms();
  }, []);

  const filtered = boms.filter((b) =>
    b.bom_reference.toLowerCase().includes(search.toLowerCase()) ||
    b.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Bills of Materials</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product BoMs, components, and operations</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors">
          <Plus size={16} /> Create BoM
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search BoMs..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading BoMs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No bills of materials found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Qty Produced</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Components</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Operations</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bom) => (
                  <tr key={bom.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/boms/${bom.id}`} className="font-medium text-blue-700 hover:text-blue-800">{bom.bom_reference}</Link>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{bom.product?.name || '—'}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{bom.qty_produced}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{bom.components?.length || 0}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{bom.operations?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
