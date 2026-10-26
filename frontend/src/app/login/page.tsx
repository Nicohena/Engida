'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Building2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { getSafeReturnPath } from '../../lib/navigation';
import GoogleButton from '../../components/auth/GoogleButton';
import { googleErrorMessage } from '../../lib/google-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [returnPath, setReturnPath] = useState('/dashboard');

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnPath(getSafeReturnPath(params.get('next'), '/dashboard'));

    const googleError = params.get('error');
    if (googleError) {
      setError(googleErrorMessage(googleError));
    }
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
      if (returnPath.includes('/host') && loggedUser.hostProfile) {
        router.push('/host/dashboard');
      } else {
        router.push(returnPath);
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
    <div className="min-h-screen bg-[#faf5ee] flex flex-col text-[#3a302a] selection:bg-[#c2652a]/20 selection:text-[#3a302a]">
      {/* Top Header */}
      <header className="bg-[#faf5ee]/95 backdrop-blur-xl border-b border-[#d8d0c8]/60 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
          >
            <span className="text-3xl font-bold tracking-tight text-[#c2652a] font-headline transition-colors group-hover:text-[#e08850]">
              Engida
            </span>
          </Link>
          {isHostFlow && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#f2ece4] text-[#c2652a] text-[11px] font-semibold tracking-wide uppercase font-body border border-[#d8d0c8]/60">
              Host Portal
            </span>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#605850] hover:text-[#c2652a] transition-colors font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to stays</span>
        </Link>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white border border-[#d8d0c8] p-8 sm:p-10 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(58,48,42,0.06)] animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#3a302a] font-headline tracking-tight">
              {isHostFlow ? 'Host Sign In' : 'Welcome back'}
            </h1>
         
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 text-sm font-medium flex items-start gap-2.5 shadow-xs font-body">
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Sign In Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#605850] mb-2 flex items-center gap-1.5 font-body">
                <Mail className="w-3.5 h-3.5 text-[#b2531b]" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-[#faf5ee]/50 border border-[#d8d0c8] rounded-xl text-[#3a302a] font-medium placeholder-[#706860] focus:outline-none focus:ring-2 focus:ring-[#b2531b]/20 focus:border-[#b2531b] focus:bg-white text-sm transition-all font-body"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#605850] flex items-center gap-1.5 font-body">
                  <Lock className="w-3.5 h-3.5 text-[#b2531b]" />
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#faf5ee]/50 border border-[#d8d0c8] rounded-xl text-[#3a302a] font-medium placeholder-[#706860] focus:outline-none focus:ring-2 focus:ring-[#b2531b]/20 focus:border-[#b2531b] focus:bg-white text-sm transition-all font-body"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#b2531b] hover:bg-[#994413] focus:outline-none focus:ring-2 focus:ring-[#b2531b]/40 disabled:opacity-50 transition-all duration-200 shadow-md shadow-[#b2531b]/20 active:scale-[0.99] cursor-pointer font-body"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#d8d0c8]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#706860] px-1 font-body">
              or
            </span>
            <span className="h-px flex-1 bg-[#d8d0c8]" />
          </div>

          {/* Social Sign In */}
          <GoogleButton nextPath={returnPath} />

          {/* Registration Link */}
          <div className="mt-6 text-center text-sm font-body text-[#605850]">
            Don&apos;t have an account?{' '}
            <Link
              href={returnPath === '/dashboard' ? '/register' : `/register?next=${encodeURIComponent(returnPath)}`}
              className="font-semibold text-[#b2531b] hover:text-[#994413] hover:underline transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
