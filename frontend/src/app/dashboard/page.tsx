'use client';

import React, { useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoadingMe(true);
    setError(null);
    try {
      const data = await apiFetch('/auth/me');
      setProfileData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMe(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="py-8 max-w-4xl mx-auto">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
            <div>
              <span className="inline-block bg-[#4A6B5D]/10 text-[#4A6B5D] dark:text-[#6E9885] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                Tenant & Landlord Portal
              </span>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                Welcome, {user?.name}!
              </h1>
              <p className="text-[var(--muted)] text-sm mt-1">
                Manage your house & bedroom bookings securely.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3.5 py-1 rounded-full text-xs font-bold ${
                user?.role === 'ADMIN' ? 'bg-[#E07A5F]/15 text-[#E07A5F] border border-[#E07A5F]/30' : 'bg-[#4A6B5D]/15 text-[#4A6B5D] dark:text-[#6E9885] border border-[#4A6B5D]/30'
              }`}>
                ROLE: {user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
            <div className="bg-[var(--background)] p-5 rounded-2xl border border-[var(--border)]">
              <p className="text-xs text-[var(--muted)] uppercase font-semibold tracking-wider">User Account ID</p>
              <p className="text-sm font-mono text-[var(--foreground)] mt-1 break-all">{user?.id}</p>
            </div>
            <div className="bg-[var(--background)] p-5 rounded-2xl border border-[var(--border)]">
              <p className="text-xs text-[var(--muted)] uppercase font-semibold tracking-wider">Registered Email</p>
              <p className="text-sm font-medium text-[var(--foreground)] mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="bg-[var(--background)] border border-[var(--border)] p-6 rounded-2xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--foreground)]">Authenticated Rental Profile</h3>
              <button
                onClick={fetchProfile}
                disabled={loadingMe}
                className="bg-[#4A6B5D] hover:bg-[#375247] text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                {loadingMe ? 'Loading...' : 'Fetch Profile Details'}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-[#E07A5F]/10 border border-[#E07A5F]/30 text-[#E07A5F] text-xs rounded-xl mb-4">
                {error}
              </div>
            )}

            {profileData ? (
              <pre className="bg-[var(--card)] p-4 rounded-xl text-xs font-mono text-[#4A6B5D] dark:text-[#6E9885] overflow-x-auto border border-[var(--border)]">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            ) : (
              <p className="text-[var(--muted)] text-xs italic">
                Click button above to test your authenticated user session token.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
            <p className="text-[var(--muted)] text-xs">
              House Rental session secured with encrypted refresh tokens.
            </p>
            <button
              onClick={() => logout()}
              className="bg-[#E07A5F]/10 hover:bg-[#E07A5F]/20 text-[#E07A5F] border border-[#E07A5F]/30 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
