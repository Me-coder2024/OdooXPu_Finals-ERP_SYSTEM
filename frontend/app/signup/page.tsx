'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password validation rules
  const passwordRules = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Contains an uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Contains a special character', valid: /[^a-zA-Z0-9]/.test(password) },
  ];

  const loginIdRules = [
    { label: '6-12 characters', valid: loginId.length >= 6 && loginId.length <= 12 },
    { label: 'Only letters, numbers, underscores', valid: /^[a-zA-Z0-9_]*$/.test(loginId) || loginId.length === 0 },
  ];

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const allValid = passwordRules.every(r => r.valid) && loginIdRules.every(r => r.valid) && passwordsMatch && email.includes('@') && name.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allValid) {
      setError('Please fix all validation errors before submitting');
      return;
    }

    setLoading(true);
    try {
      await authApi.signup({ login_id: loginId, name, email, password });
      await checkAuth();
      router.push('/dashboard');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { errors?: { message: string; field?: string }[] } } })?.response?.data?.errors;
      if (errData && errData.length > 0) {
        setError(errData.map(e => e.message).join('. '));
      } else {
        setError('Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Sign up as a System User</p>
        </div>

        {/* Sign Up Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">⚠ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login ID */}
            <div>
              <label htmlFor="login-id" className="block text-sm font-medium text-slate-700 mb-1.5">
                Enter Login ID
              </label>
              <input
                id="login-id"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. john_doe01"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
              />
              {loginId.length > 0 && (
                <div className="mt-2 space-y-1">
                  {loginIdRules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2 text-xs">
                      {rule.valid ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <X size={12} className="text-red-500" />
                      )}
                      <span className={rule.valid ? 'text-emerald-700' : 'text-red-600'}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email ID
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Enter Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
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
              {/* Password strength rules */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2 text-xs">
                      {rule.valid ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <X size={12} className="text-red-500" />
                      )}
                      <span className={rule.valid ? 'text-emerald-700' : 'text-red-600'}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Re-Enter Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
              />
              {confirmPassword.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {passwordsMatch ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-700">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X size={12} className="text-red-500" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !allValid}
              className="w-full bg-blue-700 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-800 active:bg-blue-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'SIGN UP'
              )}
            </button>
          </form>

          {/* Back to login */}
          <div className="mt-5 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 font-medium hover:underline">
              <ArrowLeft size={14} />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Validation info */}
        <div className="mt-4 bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">Account Rules</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Login ID must be unique and 6-12 characters</li>
            <li>• Email ID must not be duplicate in database</li>
            <li>• Password must contain lowercase, uppercase, and special character</li>
            <li>• Password must be at least 8 characters long</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2024 Shiv Furniture Works · XPU Finals ERP System
        </p>
      </div>
    </div>
  );
}
