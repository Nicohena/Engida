'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Building2, UserCheck, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic frontend checks before sending
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
      await register(name, email, password, role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.message || 'Registration failed. Please check your information and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-[#000000]">
      <div className="max-w-md w-full bg-white border border-[#CBD5E1] p-8 rounded-3xl shadow-lg shadow-[#33599E]/5">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-[#33599E] to-[#7093CD] text-white rounded-2xl flex items-center justify-center font-bold mx-auto mb-3 shadow-md shadow-[#33599E]/20">
            <Building2 className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-3xl font-black text-[#000000] tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm font-semibold text-[#334155]">
            Sign up to access Engida rental platform
          </p>
        </div>

        {/* Clear Alert Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-start gap-2.5 shadow-xs animate-shake">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{error}</div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-2 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Full Name"
              className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-[#000000] font-bold placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#33599E] focus:border-transparent text-sm transition"
            />
          </div>

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

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-2 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> Account Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'USER' | 'ADMIN')}
              className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-[#000000] font-bold focus:outline-none focus:ring-2 focus:ring-[#33599E] focus:border-transparent text-sm transition cursor-pointer"
            >
              <option value="USER">Tenant User (USER)</option>
              <option value="ADMIN">Property Host / Admin (ADMIN)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-black text-white bg-gradient-to-r from-[#33599E] to-[#234079] hover:from-[#234079] hover:to-[#162B54] focus:outline-none disabled:opacity-50 transition shadow-md shadow-[#33599E]/25"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm font-bold text-[#334155]">
          Already have an account?{' '}
          <Link href="/login" className="font-black text-[#33599E] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
