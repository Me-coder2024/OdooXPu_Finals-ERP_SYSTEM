'use client';

import { useEffect, useState } from 'react';
import { workCentersApi } from '@/lib/api/client';
import { WorkCenter } from '@/types';
import { Plus, Settings } from 'lucide-react';

export default function WorkCentersPage() {
  const [centers, setCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      const res = await workCentersApi.getAll();
      setCenters(res.data.data || []);
    } catch (err) { console.error('Failed to load work centers:', err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await workCentersApi.create({ name: newName, description: newDesc || undefined });
      setNewName('');
      setNewDesc('');
      setShowForm(false);
      await fetchCenters();
    } catch (err) { console.error('Failed to create work center:', err); }
    finally { setCreating(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Work Centers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage manufacturing work stations and areas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors">
          <Plus size={16} /> Add Work Center
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">New Work Center</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="e.g. Cutting Station"
                className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description"
                className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors">
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading work centers...</div>
        ) : centers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No work centers found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Description</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Operations</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Work Orders</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((wc) => (
                  <tr key={wc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Settings size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-900">{wc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{wc.description || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${wc.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {wc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">{wc._count?.operations || 0}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{wc._count?.work_orders || 0}</td>
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
