'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { getSafeReturnPath } from '../../lib/navigation';
import GoogleButton from '../../components/auth/GoogleButton';
import { googleErrorMessage } from '../../lib/google-auth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [returnPath, setReturnPath] = useState('/dashboard');

  const { register } = useAuth();
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

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      router.push(returnPath);
    } catch (err: any) {
      setError(
        err.message || 'Registration failed. Please check your information and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isHostFlow = returnPath.includes('/host');

  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col text-[#252923] selection:bg-[#234B36]/20 selection:text-[#252923]">
      {/* Top Header */}
      <header className="bg-[#F8F5ED]/95 backdrop-blur-xl border-b border-[#E5E0D5]/60 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
          >
            <span className="text-3xl font-bold tracking-tight text-[#234B36] font-headline transition-colors group-hover:text-[#2D5E43]">
              Engida
            </span>
          </Link>
          {isHostFlow && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EEF3EF] text-[#234B36] text-[11px] font-semibold tracking-wide uppercase font-body border border-[#E5E0D5]/60">
              Host Setup
            </span>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#73776F] hover:text-[#234B36] transition-colors font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to stays</span>
        </Link>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white border border-[#E5E0D5] p-8 sm:p-10 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(58,48,42,0.06)] animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#252923] font-headline tracking-tight">
              {isHostFlow ? 'Create Host Account' : 'Join Engida'}
            </h1>
          
          </div>

          {/* Clear Alert Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 text-sm font-medium flex items-start gap-2.5 shadow-xs font-body">
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#73776F] mb-2 flex items-center gap-1.5 font-body">
                <User className="w-3.5 h-3.5 text-[#b2531b]" />
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Aster Aweke"
                className="w-full px-4 py-3 bg-[#F8F5ED]/50 border border-[#E5E0D5] rounded-xl text-[#252923] font-medium placeholder-[#706860] focus:outline-none focus:ring-2 focus:ring-[#b2531b]/20 focus:border-[#b2531b] focus:bg-white text-sm transition-all font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#73776F] mb-2 flex items-center gap-1.5 font-body">
                <Mail className="w-3.5 h-3.5 text-[#b2531b]" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-[#F8F5ED]/50 border border-[#E5E0D5] rounded-xl text-[#252923] font-medium placeholder-[#706860] focus:outline-none focus:ring-2 focus:ring-[#b2531b]/20 focus:border-[#b2531b] focus:bg-white text-sm transition-all font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#73776F] mb-2 flex items-center gap-1.5 font-body">
                <Lock className="w-3.5 h-3.5 text-[#b2531b]" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 bg-[#F8F5ED]/50 border border-[#E5E0D5] rounded-xl text-[#252923] font-medium placeholder-[#706860] focus:outline-none focus:ring-2 focus:ring-[#b2531b]/20 focus:border-[#b2531b] focus:bg-white text-sm transition-all font-body"
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
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#E5E0D5]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#706860] px-1 font-body">
              or
            </span>
            <span className="h-px flex-1 bg-[#E5E0D5]" />
          </div>

          <GoogleButton nextPath={returnPath} label="Sign up with Google" />

          <div className="mt-6 text-center text-sm font-body text-[#73776F]">
            Already have an account?{' '}
            <Link
              href={returnPath === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(returnPath)}`}
              className="font-semibold text-[#b2531b] hover:text-[#994413] hover:underline transition-colors"
            >
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
