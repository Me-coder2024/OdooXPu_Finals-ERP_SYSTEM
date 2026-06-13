'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Shield, Eye, Ban, User as UserIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !user) {
    return <div className="p-8 text-center text-slate-400">Loading profile...</div>;
  }

  const accessIcon = (type: string) => {
    if (type === 'FULL') return <Shield size={14} className="text-emerald-600" />;
    if (type === 'VIEW') return <Eye size={14} className="text-amber-600" />;
    return <Ban size={14} className="text-slate-400" />;
  };

  const accessColor = (type: string) => {
    if (type === 'FULL') return 'bg-emerald-50 text-emerald-700';
    if (type === 'VIEW') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-400';
  };

  const roleBadgeColor: Record<string, string> = {
    ADMIN: 'bg-red-50 text-red-700 border-red-200',
    OWNER: 'bg-purple-50 text-purple-700 border-purple-200',
    SALES: 'bg-blue-50 text-blue-700 border-blue-200',
    PURCHASE: 'bg-amber-50 text-amber-700 border-amber-200',
    MANUFACTURING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INVENTORY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">View your account information and permissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <UserIcon size={32} className="text-blue-700" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>
            <span className={`inline-flex mt-3 px-3 py-1 rounded text-xs font-medium border ${roleBadgeColor[user.role] || 'bg-slate-50 text-slate-600'}`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Module Access (read-only) */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Module Access</h2>
            {user.module_access && user.module_access.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {user.module_access.map((access) => (
                  <div key={access.module} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    {accessIcon(access.access_type)}
                    <div>
                      <p className="text-xs font-medium text-slate-700">{access.module}</p>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${accessColor(access.access_type)}`}>
                        {access.access_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No module access configured</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
