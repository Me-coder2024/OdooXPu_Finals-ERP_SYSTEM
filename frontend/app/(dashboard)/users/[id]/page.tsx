'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/client';
import { User, ERPModule, AccessType } from '@/types';
import {
  ArrowLeft,
  Save,
  Shield,
  Eye,
  Ban,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Camera,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  MODULE_FIELDS,
  getDefaultFieldPermissions,
} from '@/lib/permissions';
import type { FieldPermission } from '@/lib/permissions';

// ─── Constants ───
const ALL_MODULES: ERPModule[] = [
  'PRODUCTS',
  'SALES',
  'PURCHASE',
  'MANUFACTURING',
  'BOM',
  'INVENTORY',
  'AUDIT',
  'USERS',
];
const ACCESS_TYPES: AccessType[] = ['FULL', 'VIEW', 'NONE'];

const TAB_MODULES = ['Sales', 'Purchase', 'Manufacturing', 'Product'] as const;

// ─── Helpers ───
const accessConfig: Record<AccessType, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  FULL: { icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Full Access' },
  VIEW: { icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50', label: 'View Only' },
  NONE: { icon: Ban, color: 'text-slate-400', bg: 'bg-slate-50', label: 'No Access' },
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessMap, setAccessMap] = useState<Record<string, AccessType>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Sales');
  const [fieldPerms, setFieldPerms] = useState<Record<string, Record<string, FieldPermission>>>({});

  const fetchUser = useCallback(async () => {
    try {
      const res = await usersApi.getById(params.id as string);
      const userData = res.data.data;
      setUser(userData);

      // Build access map
      const map: Record<string, AccessType> = {};
      userData.module_access?.forEach((a: { module: string; access_type: AccessType }) => {
        map[a.module] = a.access_type;
      });
      setAccessMap(map);

      // Initialize field permissions with defaults
      const perms: Record<string, Record<string, FieldPermission>> = {};
      MODULE_FIELDS.forEach((mf) => {
        perms[mf.module] = {};
        mf.fields.forEach((f) => {
          perms[mf.module][f.name] = getDefaultFieldPermissions(f.name, f.note);
        });
      });
      setFieldPerms(perms);
    } catch (err) {
      console.error('Failed to load user:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSaveAccess = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const moduleAccess = Object.entries(accessMap).map(([module, access_type]) => ({
        module,
        access_type,
      }));
      await usersApi.updateAccess(params.id as string, moduleAccess);
      setMessage({ text: 'Access permissions updated successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update access:', err);
      setMessage({ text: 'Failed to update permissions', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleFieldPerm = (mod: string, field: string, perm: keyof FieldPermission) => {
    setFieldPerms((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [field]: {
          ...prev[mod][field],
          [perm]: !prev[mod][field][perm],
        },
      },
    }));
  };

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-50 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-56 bg-slate-50 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-50 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="h-5 w-48 bg-slate-100 rounded animate-pulse mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                <div className="flex-1 h-8 bg-slate-50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <UserCircle size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700 mb-1">User not found</p>
        <p className="text-xs text-slate-400 mb-4">The user you're looking for doesn't exist or was deleted.</p>
        <Link
          href="/users"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  const currentModuleFields = MODULE_FIELDS.find((m) => m.module === activeTab);

  return (
    <div>
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              User Management Form View
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Only Position field is editable by System Administrator
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveAccess}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* ═══ Status Message ═══ */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 5L11 11M11 5L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {message.text}
        </div>
      )}

      {/* ═══ Profile Card ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Info Fields */}
          <div className="flex-1 space-y-3.5">
            {/* Name */}
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-slate-500 w-32 shrink-0 font-medium">Name :</span>
              <span className="text-sm text-slate-900 font-medium">{user.name}</span>
            </div>
            {/* Address */}
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-slate-500 w-32 shrink-0 font-medium">Address:</span>
              <span className="text-sm text-slate-700">
                {user.address || 'Not provided'}
              </span>
            </div>
            {/* Mobile */}
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-slate-500 w-32 shrink-0 font-medium">Mobile Number :</span>
              <span className="text-sm text-slate-700">
                {user.mobile || 'Not provided'}
              </span>
            </div>
            {/* Email */}
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-slate-500 w-32 shrink-0 font-medium">Email ID:</span>
              <span className="text-sm text-slate-700">{user.email}</span>
            </div>
            {/* Position / Role (editable) */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 w-32 shrink-0 font-medium">Position:</span>
              <span className="text-sm text-slate-900 font-medium">
                {user.role === 'ADMIN'
                  ? 'System Administrator'
                  : user.role === 'OWNER'
                    ? 'Business Owner'
                    : user.role === 'SALES'
                      ? 'Sales Manager'
                      : user.role === 'PURCHASE'
                        ? 'Purchase Manager'
                        : user.role === 'MANUFACTURING'
                          ? 'Manufacturing Manager'
                          : user.role === 'INVENTORY'
                            ? 'Inventory Manager'
                            : user.role}
              </span>
            </div>
          </div>

          {/* Profile Photo */}
          <div className="shrink-0">
            <div className="relative w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center group cursor-pointer hover:border-primary/40 transition-colors">
              <UserCircle size={40} className="text-slate-300" strokeWidth={1} />
              <div className="absolute inset-0 rounded-2xl bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                <Camera
                  size={16}
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Field-Level Permissions (Tabbed) ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
        {/* Tab Bar */}
        <div className="border-b border-slate-200 px-5">
          <div className="flex items-center gap-0">
            {TAB_MODULES.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-primary'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Field Permissions Table */}
        {currentModuleFields && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider min-w-[200px]">
                    Field
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider w-20">
                    Create
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider w-20">
                    View
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider w-20">
                    Edit
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider w-20">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentModuleFields.fields.map((field) => {
                  const perms = fieldPerms[activeTab]?.[field.name] || {
                    create: true,
                    view: true,
                    edit: true,
                    delete: true,
                  };
                  const isAutoComputed =
                    field.note === 'Auto Compute' || field.note === 'System Computed';
                  const isNotPossible =
                    field.note === 'Not possible' || field.note === 'Not Possible';
                  const isRecomputed =
                    field.note === 'Recomputed' || field.note === 'Auto Recomputed';
                  const isSpecial = isAutoComputed || isNotPossible || isRecomputed;

                  return (
                    <tr
                      key={field.name}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-medium">{field.label}</span>
                          {field.note && (
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${
                                isAutoComputed
                                  ? 'bg-sky-50 text-sky-600'
                                  : isNotPossible
                                    ? 'bg-slate-100 text-slate-400'
                                    : isRecomputed
                                      ? 'bg-amber-50 text-amber-600'
                                      : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {field.note}
                            </span>
                          )}
                        </div>
                      </td>
                      {(['create', 'view', 'edit', 'delete'] as const).map((permKey) => {
                        const isEnabled = perms[permKey];
                        const isDisabled =
                          (isAutoComputed && permKey !== 'view') ||
                          isNotPossible ||
                          (isRecomputed && (permKey === 'edit' || permKey === 'delete'));

                        return (
                          <td key={permKey} className="py-3 px-4 text-center">
                            {isDisabled ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path
                                    d="M4 4L10 10M10 4L4 10"
                                    stroke="#CBD5E1"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  toggleFieldPerm(activeTab, field.name, permKey)
                                }
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                                  isEnabled
                                    ? 'bg-emerald-50 hover:bg-emerald-100'
                                    : 'bg-red-50 hover:bg-red-100'
                                }`}
                                aria-label={`Toggle ${permKey} for ${field.label}`}
                              >
                                {isEnabled ? (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                  >
                                    <path
                                      d="M3 7L6 10L11 4"
                                      stroke="#059669"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                  >
                                    <path
                                      d="M4 4L10 10M10 4L4 10"
                                      stroke="#DC2626"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Module Access Grid ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">
              Module Access Permissions
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Configure which modules this user can access
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="text-left py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider">
                  Module
                </th>
                {ACCESS_TYPES.map((t) => {
                  const config = accessConfig[t];
                  return (
                    <th
                      key={t}
                      className="text-center py-3 px-5 font-medium text-slate-500 text-xs uppercase tracking-wider"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <config.icon size={13} className={config.color} />
                        {config.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ALL_MODULES.map((mod) => {
                const currentAccess = accessMap[mod] || 'NONE';
                const config = accessConfig[currentAccess];
                return (
                  <tr key={mod} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-5">
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}
                        >
                          <config.icon size={14} className={config.color} />
                        </span>
                        <span className="font-medium text-slate-900">{mod}</span>
                      </span>
                    </td>
                    {ACCESS_TYPES.map((type) => (
                      <td key={type} className="py-3 px-5 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="radio"
                            name={`access-${mod}`}
                            checked={currentAccess === type}
                            onChange={() =>
                              setAccessMap((prev) => ({ ...prev, [mod]: type }))
                            }
                            className="w-4 h-4 text-primary border-slate-300 focus:ring-primary/30 focus:ring-offset-0 cursor-pointer"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
