'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { auditLogsApi, usersApi } from '@/lib/api/client';
import { AuditLogEntry, ERPModule, User } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import {
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileText,
  PenLine,
  Plus,
  Trash2,
  ClipboardList,
} from 'lucide-react';

// ─── Constants ───
const MODULE_OPTIONS: (ERPModule | 'ALL')[] = [
  'ALL',
  'PRODUCTS',
  'SALES',
  'PURCHASE',
  'MANUFACTURING',
  'BOM',
  'INVENTORY',
  'AUDIT',
  'USERS',
];

const ACTION_OPTIONS = [
  'ALL',
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'CONFIRM',
  'DELIVER',
  'CANCEL',
  'AUTO_CREATE',
  'UPDATE_ACCESS',
] as const;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-emerald-700',
  UPDATE: 'text-amber-700',
  DELETE: 'text-red-600',
  STATUS_CHANGE: 'text-blue-700',
  CONFIRM: 'text-blue-700',
  DELIVER: 'text-teal-700',
  CANCEL: 'text-red-600',
  AUTO_CREATE: 'text-violet-700',
  UPDATE_ACCESS: 'text-violet-700',
};

const ITEMS_PER_PAGE = 20;

// ─── Helpers ───
function extractChangedFields(
  oldValue: Record<string, unknown> | null | undefined,
  newValue: Record<string, unknown> | null | undefined
): { field: string; oldVal: string; newVal: string }[] {
  if (!newValue && !oldValue) return [];

  const fields: { field: string; oldVal: string; newVal: string }[] = [];
  const allKeys = new Set([
    ...Object.keys(oldValue || {}),
    ...Object.keys(newValue || {}),
  ]);

  for (const key of allKeys) {
    const old = oldValue?.[key];
    const nv = newValue?.[key];

    // Skip auto_created arrays and meta fields
    if (key.startsWith('auto_created_') || key === 'auto_generated') continue;

    const oldStr = old !== undefined && old !== null ? String(old) : '-';
    const newStr = nv !== undefined && nv !== null ? String(nv) : '-';

    if (oldStr !== newStr) {
      fields.push({
        field: key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        oldVal: oldStr,
        newVal: newStr,
      });
    }
  }

  return fields;
}

function formatFieldValue(val: string): string {
  if (val === '-' || val === 'undefined' || val === 'null') return '-';
  const num = Number(val);
  if (!isNaN(num) && val.trim() !== '' && num > 100) {
    return formatCurrency(num);
  }
  return val;
}

function getRecordType(entity: string): string {
  // Convert camelCase/PascalCase to readable
  return entity.replace(/([A-Z])/g, ' $1').trim();
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ─── Fetch Users for dropdown ───
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await usersApi.getAll({ limit: 100 });
        setUsers(res.data.data || []);
      } catch {
        // silently ignore
      }
    };
    loadUsers();
  }, []);

  // ─── Fetch Logs ───
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (moduleFilter !== 'ALL') params.module = moduleFilter;
      if (userFilter !== 'ALL') params.user_id = userFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await auditLogsApi.getAll(
        params as {
          page: number;
          limit: number;
          module?: string;
          user_id?: string;
          start_date?: string;
          end_date?: string;
        }
      );
      const allLogs: AuditLogEntry[] = res.data.data || [];

      // Client-side action filter (backend doesn't support action param yet)
      const filtered =
        actionFilter !== 'ALL'
          ? allLogs.filter((l) => l.action === actionFilter)
          : allLogs;

      setLogs(filtered);
      setTotalCount(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter, userFilter, actionFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ─── Stat counters ───
  const stats = useMemo(() => {
    const createCount = logs.filter(
      (l) => l.action === 'CREATE' || l.action === 'AUTO_CREATE'
    ).length;
    const updateCount = logs.filter(
      (l) =>
        l.action === 'UPDATE' ||
        l.action === 'STATUS_CHANGE' ||
        l.action === 'CONFIRM' ||
        l.action === 'DELIVER' ||
        l.action === 'UPDATE_ACCESS'
    ).length;
    const deleteCount = logs.filter(
      (l) => l.action === 'DELETE' || l.action === 'CANCEL'
    ).length;
    return { total: totalCount, createCount, updateCount, deleteCount };
  }, [logs, totalCount]);

  const handleReset = () => {
    setModuleFilter('ALL');
    setActionFilter('ALL');
    setUserFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
  };

  // ─── Pagination range ───
  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push('...');
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        range.push(i);
      }
      if (page < totalPages - 2) range.push('...');
      range.push(totalPages);
    }
    return range;
  }, [page, totalPages]);

  // ─── Loading Skeleton ───
  if (loading && logs.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Should include all fields whose logs needs to be tracked
          </p>
        </div>

        {/* Stat card skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg p-4 animate-pulse bg-slate-100 h-20"
            />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="h-9 w-full bg-slate-100 rounded-md animate-pulse" />
          </div>
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-3.5 w-36 bg-slate-100 rounded" />
                <div className="h-3.5 w-20 bg-slate-100 rounded" />
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
                <div className="h-3.5 w-28 bg-slate-100 rounded" />
                <div className="h-3.5 w-20 bg-slate-50 rounded" />
                <div className="h-3.5 w-16 bg-slate-50 rounded" />
                <div className="flex-1" />
                <div className="h-3.5 w-16 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ Header ═══ */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Audit Logs
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Should include all fields whose logs needs to be tracked
        </p>
      </div>

      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Logs */}
        <div className="rounded-lg bg-primary px-5 py-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">
              Total Logs
            </span>
            <ClipboardList size={16} className="opacity-60" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
          <p className="text-[11px] opacity-60 mt-0.5">All time logs</p>
        </div>

        {/* Create Actions */}
        <div className="rounded-lg bg-emerald-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">
              Create Actions
            </span>
            <Plus size={16} className="opacity-60" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.createCount.toLocaleString()}</p>
          <p className="text-[11px] opacity-60 mt-0.5">Records Created</p>
        </div>

        {/* Update Actions */}
        <div className="rounded-lg bg-amber-500 px-5 py-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">
              Update Actions
            </span>
            <PenLine size={16} className="opacity-60" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.updateCount.toLocaleString()}</p>
          <p className="text-[11px] opacity-60 mt-0.5">Records Updated</p>
        </div>

        {/* Delete Actions */}
        <div className="rounded-lg bg-red-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">
              Delete Actions
            </span>
            <Trash2 size={16} className="opacity-60" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats.deleteCount.toLocaleString()}</p>
          <p className="text-[11px] opacity-60 mt-0.5">Records Deleted</p>
        </div>
      </div>

      {/* ═══ Filter Bar ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider shrink-0">
              Date Range
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <CalendarDays
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-32"
                />
              </div>
              <span className="text-xs text-slate-400">–</span>
              <div className="relative">
                <CalendarDays
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-32"
                />
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* User Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider shrink-0">
              User
            </label>
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[120px]"
            >
              <option value="ALL">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Module Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider shrink-0">
              Module
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[120px]"
            >
              {MODULE_OPTIONS.map((mod) => (
                <option key={mod} value={mod}>
                  {mod === 'ALL' ? 'All Modules' : mod}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Actions Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider shrink-0">
              Actions
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[120px]"
            >
              {ACTION_OPTIONS.map((act) => (
                <option key={act} value={act}>
                  {act === 'ALL' ? 'All Actions' : act.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Filter & Reset Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleFilter}
              className="inline-flex items-center gap-1.5 bg-primary text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors"
            >
              <Filter size={13} />
              Filter
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          </div>

          {/* Pagination (inline) */}
          {totalPages > 1 && (
            <>
              <div className="w-px h-6 bg-slate-200 hidden lg:block" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                {paginationRange.map((p, idx) =>
                  typeof p === 'string' ? (
                    <span
                      key={`dots-${idx}`}
                      className="w-7 h-7 flex items-center justify-center text-xs text-slate-400"
                    >
                      ⋯
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                        page === p
                          ? 'bg-primary text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ═══ Data Table ═══ */}
        {logs.length === 0 && !loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              No audit logs found
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Try adjusting your filters or date range to find matching records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    Date & Time
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Module
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    Record Type
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    Record ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    Field Changed
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    Old Value
                  </th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    New Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => {
                  const changes = extractChangedFields(
                    log.old_value as Record<string, unknown> | null,
                    log.new_value as Record<string, unknown> | null
                  );
                  const actionColor =
                    ACTION_COLORS[log.action] || 'text-slate-600';

                  // If there are multiple changed fields, render one row per field
                  if (changes.length > 1) {
                    return changes.map((change, idx) => (
                      <tr
                        key={`${log.id}-${idx}`}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          idx > 0 ? 'border-t-0' : ''
                        }`}
                      >
                        {idx === 0 ? (
                          <>
                            <td
                              className="py-3 px-5 text-slate-600 whitespace-nowrap text-xs"
                              rowSpan={changes.length}
                            >
                              {formatDateTime(log.created_at)}
                            </td>
                            <td
                              className="py-3 px-4 text-slate-800 font-medium text-xs"
                              rowSpan={changes.length}
                            >
                              {log.user?.name || '—'}
                            </td>
                            <td
                              className="py-3 px-4 text-xs"
                              rowSpan={changes.length}
                            >
                              <span className="text-slate-700 capitalize">
                                {log.module.charAt(0) +
                                  log.module.slice(1).toLowerCase()}
                              </span>
                            </td>
                            <td
                              className="py-3 px-4 text-slate-600 text-xs"
                              rowSpan={changes.length}
                            >
                              {getRecordType(log.entity)}
                            </td>
                            <td
                              className="py-3 px-4 text-xs"
                              rowSpan={changes.length}
                            >
                              <span className="font-mono text-slate-500">
                                {log.entity_id.substring(0, 8).toUpperCase()}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-4 text-xs font-medium ${actionColor}`}
                              rowSpan={changes.length}
                            >
                              {log.action.replace(/_/g, ' ')}
                            </td>
                          </>
                        ) : null}
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {change.field}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 text-right font-mono">
                          {formatFieldValue(change.oldVal)}
                        </td>
                        <td className="py-3 px-5 text-xs text-slate-900 text-right font-mono font-medium">
                          {formatFieldValue(change.newVal)}
                        </td>
                      </tr>
                    ));
                  }

                  // Single change or no changes
                  const firstChange = changes[0];
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 px-5 text-slate-600 whitespace-nowrap text-xs">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium text-xs">
                        {log.user?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="text-slate-700 capitalize">
                          {log.module.charAt(0) +
                            log.module.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {getRecordType(log.entity)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="font-mono text-slate-500">
                          {log.entity_id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-xs font-medium ${actionColor}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {firstChange?.field || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 text-right font-mono">
                        {firstChange
                          ? formatFieldValue(firstChange.oldVal)
                          : '-'}
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-900 text-right font-mono font-medium">
                        {firstChange
                          ? formatFieldValue(firstChange.newVal)
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Bottom Pagination ═══ */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(page * ITEMS_PER_PAGE, totalCount)} of{' '}
              {totalCount.toLocaleString()} logs
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
