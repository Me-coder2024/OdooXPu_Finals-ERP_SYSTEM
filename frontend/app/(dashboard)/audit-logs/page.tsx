'use client';

import { useEffect, useState } from 'react';
import { auditLogsApi } from '@/lib/api/client';
import { AuditLogEntry, ERPModule } from '@/types';
import { Filter, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const MODULE_OPTIONS: (ERPModule | 'ALL')[] = ['ALL', 'PRODUCTS', 'SALES', 'PURCHASE', 'MANUFACTURING', 'BOM', 'INVENTORY', 'AUDIT', 'USERS'];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, moduleFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 30 };
      if (moduleFilter !== 'ALL') params.module = moduleFilter;
      const res = await auditLogsApi.getAll(params as { page: number; limit: number; module?: string });
      setLogs(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const actionColor: Record<string, string> = {
    CREATE: 'bg-emerald-50 text-emerald-700',
    UPDATE: 'bg-blue-50 text-blue-700',
    DELETE: 'bg-red-50 text-red-700',
    STATUS_CHANGE: 'bg-amber-50 text-amber-700',
    UPDATE_ACCESS: 'bg-violet-50 text-violet-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Complete log of all system mutations — Admin only</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-sm text-slate-500">Module:</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {MODULE_OPTIONS.map((mod) => (
              <button key={mod} onClick={() => { setModuleFilter(mod); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${moduleFilter === mod ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {mod === 'ALL' ? 'All' : mod}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 w-8" />
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Timestamp</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">User</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Module</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                        <td className="py-3 px-4">
                          {expandedRow === log.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{log.user?.name || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{log.module}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${actionColor[log.action] || 'bg-slate-100 text-slate-600'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{log.entity}</td>
                      </tr>
                      {expandedRow === log.id && (
                        <tr key={`${log.id}-detail`} className="border-b border-slate-100 bg-slate-50">
                          <td colSpan={6} className="py-4 px-8">
                            <div className="grid grid-cols-2 gap-6">
                              {log.old_value && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-2">Old Value</p>
                                  <pre className="text-xs bg-white p-3 rounded border border-slate-200 overflow-auto max-h-40">
                                    {JSON.stringify(log.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_value && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-2">New Value</p>
                                  <pre className="text-xs bg-white p-3 rounded border border-slate-200 overflow-auto max-h-40">
                                    {JSON.stringify(log.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50">Previous</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
