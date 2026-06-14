'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { profileApi, apiClient } from '@/lib/api/client';
import {
  Shield, Eye, Ban, User as UserIcon, Camera, Trash2,
  Pencil, Save, X, Loader2, Check,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', mobile: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Photo — fetch as blob via authenticated client
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchPhoto = useCallback(async (userId: string) => {
    try {
      const response = await apiClient.get(`/users/${userId}/photo`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      setPhotoUrl(url);
    } catch {
      setPhotoUrl(null);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', address: user.address || '', mobile: user.mobile || '' });
      fetchPhoto(user.id);
    }
  }, [user, fetchPhoto]);

  if (!mounted || !user) {
    return <div className="p-8 text-center text-slate-400">Loading profile...</div>;
  }

  // ── Photo handlers ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: 'File too large. Max 5MB.', type: 'error' });
      return;
    }

    setUploadingPhoto(true);
    setMessage({ text: '', type: '' });
    try {
      await profileApi.uploadPhoto(user.id, file);
      await fetchPhoto(user.id);
      setMessage({ text: 'Photo uploaded successfully!', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to upload photo', type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    setUploadingPhoto(true);
    try {
      await profileApi.deletePhoto(user.id);
      setPhotoUrl(null);
      setMessage({ text: 'Photo removed', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to remove photo', type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Profile save ──
  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await profileApi.update({
        name: form.name,
        address: form.address,
        mobile: form.mobile,
      });
      await checkAuth(); // Refresh user data in store
      setEditing(false);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: user.name || '', address: user.address || '', mobile: user.mobile || '' });
    setEditing(false);
  };

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
        <p className="text-sm text-slate-500 mt-1">Manage your account information</p>
      </div>

      {/* Status message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check size={14} /> : <X size={14} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Left: Photo + Quick Info Card ═══ */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Photo Upload */}
            <div className="relative group mx-auto w-28 h-28 mb-5">
              <div className="w-28 h-28 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setPhotoUrl(null)}
                  />
                ) : (
                  <UserIcon size={40} className="text-slate-400" />
                )}
              </div>

              {/* Overlay buttons */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="p-2 bg-white/90 rounded-full text-slate-700 hover:bg-white transition-colors"
                  title="Upload photo"
                >
                  {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
                {photoUrl && (
                  <button
                    onClick={handlePhotoDelete}
                    disabled={uploadingPhoto}
                    className="p-2 bg-white/90 rounded-full text-red-600 hover:bg-white transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">{user.name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
              <span className={`inline-flex mt-3 px-3 py-1 rounded-full text-xs font-semibold border ${roleBadgeColor[user.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {user.role}
              </span>
            </div>

            <p className="text-[11px] text-center text-slate-400 mt-4">
              Click on photo to upload or change • Max 5MB
            </p>
          </div>
        </div>

        {/* ═══ Right: Editable Details ═══ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Personal Details</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleCancel} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                    <X size={12} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name — editable */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-900 py-2">{user.name}</p>
                )}
              </div>

              {/* Email — read-only */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  Email ID
                  <span className="ml-1.5 text-[10px] text-slate-400 normal-case">(read-only)</span>
                </label>
                <p className="text-sm text-slate-700 py-2">{user.email}</p>
              </div>

              {/* Address — editable */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Colaba, Mumbai, 400001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm text-slate-700 py-2">{user.address || '—'}</p>
                )}
              </div>

              {/* Mobile — editable */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
                {editing ? (
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="e.g. +918000000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm text-slate-700 py-2">{user.mobile || '—'}</p>
                )}
              </div>

              {/* Position/Role — read-only */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  Position
                  <span className="ml-1.5 text-[10px] text-slate-400 normal-case">(admin only)</span>
                </label>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border mt-1 ${roleBadgeColor[user.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {user.role}
                </span>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${user.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Module Access (read-only) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Module Access</h2>
            {user.module_access && user.module_access.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {user.module_access.map((access) => (
                  <div key={access.module} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
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
              <p className="text-sm text-slate-500">Default view access to core modules</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
