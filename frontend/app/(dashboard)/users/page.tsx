'use client';

import { useEffect, useState, useCallback } from 'react';
import { usersApi } from '@/lib/api/client';
import { User } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Filter,
  UserCircle,
  Shield,
  Eye,
  Ban,
  ChevronRight,
  Users as UsersIcon,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { PERMISSION_MATRIX } from '@/lib/permissions';

// ─── Role badge color map ───
const ROLE_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  ADMIN: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  OWNER: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  SALES: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  PURCHASE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  MANUFACTURING: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  INVENTORY: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

const ACCESS_ICON_MAP: Record<string, { icon: typeof Shield; color: string }> = {
  FULL: { icon: Shield, color: 'text-emerald-600' },
  VIEW: { icon: Eye, color: 'text-amber-600' },
  NONE: { icon: Ban, color: 'text-slate-300' },
};

type ViewMode = 'list' | 'grid';

// ─── Add User Modal ───
function AddUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES' as string,
    mobile: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await usersApi.create(form);
      onCreated();
      onClose();
      setForm({ name: '', email: '', password: '', role: 'SALES', mobile: '', address: '' });
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { errors?: { message: string }[] } } };
      setError(axErr.response?.data?.errors?.[0]?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add New User</h2>
            <p className="text-xs text-slate-500 mt-0.5">Create a new user with role-based access</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="e.g. rahul@shivfurniture.com"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
              <option value="SALES">Sales</option>
              <option value="PURCHASE">Purchase</option>
              <option value="MANUFACTURING">Manufacturing</option>
              <option value="INVENTORY">Inventory</option>
            </select>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile</label>
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Mumbai, Maharashtra"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showPermMatrix, setShowPermMatrix] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await usersApi.getAll({ limit: 100 });
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Client-side filter (instant, no debounce needed) ───
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getAccess = (user: User, mod: string) => {
    const a = user.module_access?.find((m) => m.module === mod);
    return a?.access_type || 'NONE';
  };

  // ─── Toggle active/inactive ───
  const handleToggleActive = async (user: User) => {
    setTogglingId(user.id);
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      // Update local state immediately
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      );
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage users and configure module access
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <div className="h-9 w-72 bg-slate-100 rounded-md animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 bg-slate-100 rounded" />
                  <div className="h-3 w-48 bg-slate-50 rounded" />
                </div>
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Group unique modules from permission matrix ───
  const permModules = [...new Set(PERMISSION_MATRIX.map((p) => p.module))];

  return (
    <div>
      {/* ═══ Page Header ═══ */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage users, roles, and module access permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPermMatrix(!showPermMatrix)}
            className="inline-flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Shield size={15} />
            Permission Matrix
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus size={15} />
            Add User
          </button>
        </div>
      </div>

      {/* ═══ Permission Matrix Panel (expandable) ═══ */}
      {showPermMatrix && (
        <div className="bg-white rounded-lg border border-slate-200 mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-slate-900">
                Role-Based Permission Matrix
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Global access rules for Admin vs User roles
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Module
                  </th>
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Action
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    None
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permModules.map((mod) => {
                  const actions = PERMISSION_MATRIX.filter((p) => p.module === mod);
                  return actions.map((perm, idx) => (
                    <tr
                      key={`${mod}-${perm.action}`}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {idx === 0 ? (
                        <td
                          className="py-2.5 px-5 font-medium text-slate-900 text-sm"
                          rowSpan={actions.length}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${mod === 'Sales'
                                ? 'bg-blue-500'
                                : mod === 'Purchase'
                                  ? 'bg-amber-500'
                                  : mod === 'Manufacturing'
                                    ? 'bg-emerald-500'
                                    : 'bg-violet-500'
                                }`}
                            />
                            {mod}
                          </span>
                        </td>
                      ) : null}
                      <td className="py-2.5 px-5 text-slate-600">{perm.action}</td>
                      <td className="py-2.5 px-4 text-center">
                        {perm.admin ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M3 7L6 10L11 4"
                                stroke="#059669"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-50">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M4 4L10 10M10 4L4 10"
                                stroke="#DC2626"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {perm.user ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M3 7L6 10L11 4"
                                stroke="#059669"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-50">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M4 4L10 10M10 4L4 10"
                                stroke="#DC2626"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {perm.none ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M3 7L6 10L11 4"
                                stroke="#059669"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-50">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M4 4L10 10M10 4L4 10"
                                stroke="#DC2626"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                        )}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ User List Card ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by name, email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600">
              <Filter size={15} />
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              title="List view"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* ── Summary Bar ── */}
        <div className="px-5 py-2 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </span>
          <div className="flex items-center gap-3">
            {['ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING'].map((r) => {
              const count = filteredUsers.filter((u) => u.role === r).length;
              if (count === 0) return null;
              const badge = ROLE_BADGE[r] || ROLE_BADGE.INVENTORY;
              return (
                <span key={r} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {r.charAt(0) + r.slice(1).toLowerCase()} ({count})
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Empty State ── */}
        {filteredUsers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <UsersIcon size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No users found</p>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">
              {search
                ? `No users match "${search}". Try adjusting your search.`
                : 'Add your first user to get started.'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              <Plus size={14} />
              Add User
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* ── List View ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Products
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Sales
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Purchase
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Mfg
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    BoM
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Inventory
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => {
                  const badge = ROLE_BADGE[user.role] || ROLE_BADGE.INVENTORY;
                  const isToggling = togglingId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className="group hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <Link
                          href={`/users/${user.id}`}
                          className="flex items-center gap-3 group/name"
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <UserCircle
                              size={20}
                              className="text-slate-400"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate group-hover/name:text-primary transition-colors">
                              {user.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {user.role}
                        </span>
                      </td>
                      {['PRODUCTS', 'SALES', 'PURCHASE', 'MANUFACTURING', 'BOM', 'INVENTORY'].map(
                        (mod) => {
                          const access = getAccess(user, mod);
                          const iconConfig = ACCESS_ICON_MAP[access] || ACCESS_ICON_MAP.NONE;
                          const Icon = iconConfig.icon;
                          return (
                            <td key={mod} className="py-3 px-3 text-center">
                              <span
                                className="inline-flex items-center justify-center"
                                title={`${mod}: ${access}`}
                              >
                                <Icon size={15} className={iconConfig.color} />
                              </span>
                            </td>
                          );
                        }
                      )}
                      {/* ── Status Toggle Button ── */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(user);
                          }}
                          disabled={isToggling}
                          className="inline-flex items-center gap-1.5 group/toggle"
                          title={`Click to ${user.is_active ? 'deactivate' : 'activate'} this user`}
                        >
                          {/* Toggle switch */}
                          <div
                            className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                              isToggling
                                ? 'bg-slate-300'
                                : user.is_active
                                  ? 'bg-emerald-500 group-hover/toggle:bg-emerald-600'
                                  : 'bg-slate-300 group-hover/toggle:bg-slate-400'
                            }`}
                          >
                            <div
                              className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-200 ${
                                user.is_active ? 'left-[14px]' : 'left-[2px]'
                              }`}
                            />
                          </div>
                          {/* Label */}
                          <span
                            className={`text-xs font-medium transition-colors ${
                              user.is_active ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : user.is_active ? (
                              'Active'
                            ) : (
                              'Inactive'
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/users/${user.id}`}
                          className="p-1.5 rounded-md text-slate-300 group-hover:text-slate-500 hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Grid View ── */
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map((user) => {
              const badge = ROLE_BADGE[user.role] || ROLE_BADGE.INVENTORY;
              const isToggling = togglingId === user.id;
              return (
                <div
                  key={user.id}
                  className="group block border border-slate-200 rounded-lg p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Link href={`/users/${user.id}`}>
                      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
                        <UserCircle
                          size={24}
                          className="text-slate-400"
                          strokeWidth={1.5}
                        />
                      </div>
                    </Link>
                    {/* Toggle in grid view */}
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={isToggling}
                      className="inline-flex items-center gap-1.5"
                      title={`Click to ${user.is_active ? 'deactivate' : 'activate'} this user`}
                    >
                      <div
                        className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                          isToggling
                            ? 'bg-slate-300'
                            : user.is_active
                              ? 'bg-emerald-500 hover:bg-emerald-600'
                              : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                      >
                        <div
                          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-200 ${
                            user.is_active ? 'left-[14px]' : 'left-[2px]'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          user.is_active ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : user.is_active ? (
                          'Active'
                        ) : (
                          'Inactive'
                        )}
                      </span>
                    </button>
                  </div>
                  <Link href={`/users/${user.id}`}>
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary transition-colors">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5 mb-3">
                      {user.email}
                    </p>
                  </Link>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {user.role}
                  </span>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                    {['PRODUCTS', 'SALES', 'PURCHASE', 'MANUFACTURING'].map((mod) => {
                      const access = getAccess(user, mod);
                      const iconConfig = ACCESS_ICON_MAP[access] || ACCESS_ICON_MAP.NONE;
                      const Icon = iconConfig.icon;
                      return (
                        <span
                          key={mod}
                          className="flex items-center gap-1 text-xs text-slate-400"
                          title={`${mod}: ${access}`}
                        >
                          <Icon size={12} className={iconConfig.color} />
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Add User Modal ═══ */}
      <AddUserModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          setLoading(true);
          fetchUsers();
        }}
      />
    </div>
  );
}
