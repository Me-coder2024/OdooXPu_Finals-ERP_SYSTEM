'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/client';
import { User, ERPModule, AccessType } from '@/types';
import { ArrowLeft, Save, Shield, Eye, Ban } from 'lucide-react';
import Link from 'next/link';

const ALL_MODULES: ERPModule[] = ['PRODUCTS', 'SALES', 'PURCHASE', 'MANUFACTURING', 'BOM', 'INVENTORY', 'AUDIT', 'USERS'];
const ACCESS_TYPES: AccessType[] = ['FULL', 'VIEW', 'NONE'];

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessMap, setAccessMap] = useState<Record<string, AccessType>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await usersApi.getById(params.id as string);
        const userData = res.data.data;
        setUser(userData);
        const map: Record<string, AccessType> = {};
        userData.module_access?.forEach((a: { module: string; access_type: AccessType }) => {
          map[a.module] = a.access_type;
        });
        setAccessMap(map);
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [params.id]);

  const handleSaveAccess = async () => {
    setSaving(true);
    setMessage('');
    try {
      const moduleAccess = Object.entries(accessMap).map(([module, access_type]) => ({
        module,
        access_type,
      }));
      await usersApi.updateAccess(params.id as string, moduleAccess);
      setMessage('Access permissions updated successfully');
    } catch (err) {
      console.error('Failed to update access:', err);
      setMessage('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const accessIcon = (type: AccessType) => {
    if (type === 'FULL') return <Shield size={16} className="text-emerald-600" />;
    if (type === 'VIEW') return <Eye size={16} className="text-amber-600" />;
    return <Ban size={16} className="text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">Loading user details...</div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">User not found</p>
        <Link href="/users" className="text-blue-700 text-sm mt-2 inline-block">Back to Users</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email} · {user.role}</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">User Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Full Name</p>
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Email</p>
            <p className="text-sm text-slate-700">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Role</p>
            <p className="text-sm font-medium text-slate-900">{user.role}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {user.mobile && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Mobile</p>
              <p className="text-sm text-slate-700">{user.mobile}</p>
            </div>
          )}
          {user.address && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Address</p>
              <p className="text-sm text-slate-700">{user.address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Module Access Grid */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Module Access Permissions</h2>
          <button
            onClick={handleSaveAccess}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-md text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Module</th>
                {ACCESS_TYPES.map((t) => (
                  <th key={t} className="text-center py-3 px-4 font-medium text-slate-600">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map((mod) => (
                <tr key={mod} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                    {accessIcon(accessMap[mod] || 'NONE')}
                    {mod}
                  </td>
                  {ACCESS_TYPES.map((type) => (
                    <td key={type} className="py-3 px-4 text-center">
                      <input
                        type="radio"
                        name={`access-${mod}`}
                        checked={(accessMap[mod] || 'NONE') === type}
                        onChange={() => setAccessMap((prev) => ({ ...prev, [mod]: type }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
