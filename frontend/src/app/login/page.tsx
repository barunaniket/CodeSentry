'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) redirectByRole(data.user.role);
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, []);

  const redirectByRole = (role: string) => {
    if (role === 'ADMIN') router.replace('/admin/dashboard');
    else if (role === 'MODERATOR') router.replace('/moderator/dashboard');
    else router.replace('/student/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      redirectByRole(data.user.role);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-4 py-12">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-6 h-6 text-[#1F2B3A]" strokeWidth={2} />
          <h1 className="text-2xl font-bold text-[#172334] tracking-tight">CodeSentry</h1>
        </div>
        <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">
          DBMS Mini Project: Vector &amp; Plagiarism Detection
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full bg-white border border-[#D9DEE5] rounded-lg shadow-sm"
        style={{ maxWidth: '430px' }}
      >
        <div className="px-8 pt-8 pb-8">
          <h2 className="text-xl font-semibold text-[#172334] mb-1">Welcome Back</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sign in to access your CodeSentry workspace.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#172334] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-[#D9DEE5] rounded-md px-3 py-2 text-sm text-[#172334] placeholder-gray-400 focus:outline-none focus:border-[#1F2B3A] focus:ring-1 focus:ring-[#1F2B3A] transition-colors bg-white"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[#172334]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-gray-500 hover:text-[#1F2B3A] transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full border border-[#D9DEE5] rounded-md px-3 py-2 pr-10 text-sm text-[#172334] placeholder-gray-400 focus:outline-none focus:border-[#1F2B3A] focus:ring-1 focus:ring-[#1F2B3A] transition-colors bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#D9DEE5] accent-[#1F2B3A] cursor-pointer"
              />
              <label
                htmlFor="rememberMe"
                className="text-sm text-gray-600 cursor-pointer select-none"
              >
                Remember me
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-[#1F2B3A] hover:bg-[#172334] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[#D9DEE5] px-8 py-4 bg-[#F8F9FA] rounded-b-lg">
          <p className="text-sm text-center text-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-[#1F2B3A] font-medium hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-xs text-gray-400 text-center">
        CodeSentry — DBMS Mini Project &nbsp;·&nbsp; PostgreSQL + pgvector
      </p>
    </div>
  );
}
