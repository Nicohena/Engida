'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Mail, Lock, Building2, AlertCircle, ArrowLeft } from 'lucide-react';
import { getSafeReturnPath } from '../../lib/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [returnPath, setReturnPath] = useState('/dashboard');

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setReturnPath(getSafeReturnPath(new URLSearchParams(window.location.search).get('next'), '/dashboard'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (returnPath && returnPath !== '/dashboard') {
        router.push(returnPath);
      } else if (loggedUser.hostProfile) {
        router.push('/host/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.message || 'Incorrect email or password. Please verify your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isHostFlow = returnPath.includes('/host');

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col text-[#000000]">
      {/* Top Header */}
      <header className="bg-white border-b border-[#CBD5E1] py-4 px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33599E] to-[#234079] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-[#000000] leading-none block">
              Engida
            </span>
            <span className="text-[10px] font-bold text-[#33599E] uppercase tracking-widest leading-none">
              {isHostFlow ? 'Host Authentication' : 'Authentication'}
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#64748B] hover:text-[#33599E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white border border-[#CBD5E1] p-8 sm:p-10 rounded-3xl shadow-lg shadow-[#33599E]/5">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#33599E] to-[#7093CD] text-white rounded-2xl flex items-center justify-center font-bold mx-auto mb-3 shadow-md shadow-[#33599E]/20">
              <Building2 className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h2 className="text-3xl font-black text-[#000000] tracking-tight">
              {isHostFlow ? 'Host Sign In' : 'Engida Sign In'}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#334155]">
              {isHostFlow
                ? 'Sign in to access your Host Portal or set up your host profile'
                : 'Sign in to access your authenticated dashboard'}
            </p>
          </div>

          {/* Clear Alert Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-2 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-[#000000] font-bold placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#33599E] focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-2 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-[#000000] font-bold placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#33599E] focus:border-transparent text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-black text-white bg-gradient-to-r from-[#33599E] to-[#234079] hover:from-[#234079] hover:to-[#162B54] focus:outline-none disabled:opacity-50 transition shadow-md shadow-[#33599E]/25 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm font-bold text-[#334155]">
            Don&apos;t have an account?{' '}
            <Link
              href={returnPath === '/dashboard' ? '/register' : `/register?next=${encodeURIComponent(returnPath)}`}
              className="font-black text-[#33599E] hover:underline"
            >
              Register Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
