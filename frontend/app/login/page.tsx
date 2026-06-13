'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { Shield, User, Eye, EyeOff } from 'lucide-react';

type LoginMode = 'admin' | 'user';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [mode, setMode] = useState<LoginMode>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setError(msg || 'Invalid Login ID or Password');
    } finally {
      setLoading(false);
    }
  };

  const adminCredentials = [
    { role: 'Admin', email: 'admin@shivfurniture.com', pass: 'Admin@123' },
    { role: 'Owner', email: 'owner@shivfurniture.com', pass: 'Owner@123' },
  ];

  const userCredentials = [
    { role: 'Sales', email: 'sales@shivfurniture.com', pass: 'Sales@123' },
    { role: 'Purchase', email: 'purchase@shivfurniture.com', pass: 'Purchase@123' },
    { role: 'Manufacturing', email: 'mfg@shivfurniture.com', pass: 'Mfg@123' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* App Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-700/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Shiv Furniture Works</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise Resource Planning System</p>
        </div>

        {/* Login Mode Toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('admin'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'admin'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield size={16} />
            System Administrator
          </button>
          <button
            type="button"
            onClick={() => { setMode('user'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'user'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={16} />
            System User
          </button>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === 'admin' ? 'Login as System Administrator' : 'Login as System User'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'admin'
                ? 'Manage access rights for system users'
                : 'Access the ERP software based on your permissions'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">⚠ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-id" className="block text-sm font-medium text-slate-700 mb-1.5">
                Login ID / Email
              </label>
              <input
                id="login-id"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'admin' ? 'admin@shivfurniture.com' : 'your@email.com'}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-800 active:bg-blue-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-5 flex items-center justify-between text-sm">
            <button type="button" className="text-blue-700 hover:text-blue-800 font-medium hover:underline">
              Forgot Password?
            </button>
            {mode === 'user' && (
              <Link href="/signup" className="text-blue-700 hover:text-blue-800 font-medium hover:underline">
                Sign Up
              </Link>
            )}
          </div>

          {/* Switch mode link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'admin' ? 'user' : 'admin')}
              className="text-sm text-slate-500 hover:text-blue-700 transition-colors"
            >
              {mode === 'admin' ? 'Login as User →' : 'Login as System Administrator →'}
            </button>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Demo Credentials</p>
          <div className="space-y-1.5">
            {(mode === 'admin' ? adminCredentials : userCredentials).map((cred) => (
              <button
                key={cred.role}
                type="button"
                onClick={() => { setEmail(cred.email); setPassword(cred.pass); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">{cred.role}</span>
                </span>
                <span className="text-xs text-slate-400 group-hover:text-blue-600 font-mono">{cred.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2024 Shiv Furniture Works · XPU Finals ERP System
        </p>
      </div>
    </div>
  );
}
