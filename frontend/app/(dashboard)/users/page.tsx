'use client';

import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api/client';
import { User } from '@/types';
import { Search, Plus, Shield, Eye, Ban } from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await usersApi.getAll({ limit: 100 });
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadgeColor: Record<string, string> = {
    ADMIN: 'bg-red-50 text-red-700 border-red-200',
    OWNER: 'bg-purple-50 text-purple-700 border-purple-200',
    SALES: 'bg-blue-50 text-blue-700 border-blue-200',
    PURCHASE: 'bg-amber-50 text-amber-700 border-amber-200',
    MANUFACTURING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INVENTORY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  const accessIcon = (type: string) => {
    if (type === 'FULL') return <Shield size={14} className="text-emerald-600" />;
    if (type === 'VIEW') return <Eye size={14} className="text-amber-600" />;
    return <Ban size={14} className="text-slate-400" />;
  };

  const accessColor = (type: string) => {
    if (type === 'FULL') return 'bg-emerald-50 text-emerald-700';
    if (type === 'VIEW') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-50 text-slate-400';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage users and their module access permissions</p>
        </div>
        <Link
          href="/users/new"
          className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          <Plus size={16} />
          Add User
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Role</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Products</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Sales</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Purchase</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Mfg</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">BoM</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Inventory</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const getAccess = (mod: string) => {
                    const a = user.module_access?.find((m) => m.module === mod);
                    return a?.access_type || 'NONE';
                  };

                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="py-3 px-4">
                        <Link href={`/users/${user.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                          {user.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${roleBadgeColor[user.role] || 'bg-slate-50 text-slate-600'}`}>
                          {user.role}
                        </span>
                      </td>
                      {['PRODUCTS', 'SALES', 'PURCHASE', 'MANUFACTURING', 'BOM', 'INVENTORY'].map((mod) => (
                        <td key={mod} className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${accessColor(getAccess(mod))}`}>
                            {accessIcon(getAccess(mod))}
                            {getAccess(mod)}
                          </span>
                        </td>
                      ))}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
