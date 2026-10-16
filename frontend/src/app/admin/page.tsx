'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { apiFetch } from '../../lib/api';

export default function AdminPage() {
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const data = await apiFetch('/auth/admin');
        setAdminData(data);
      } catch (err: any) {
        setError(err.message || 'Access denied to admin endpoint.');
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="py-8 max-w-4xl mx-auto">
        <div className="bg-[var(--card)] border border-[#E07A5F]/30 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🔑</span>
            <div>
              <span className="bg-[#E07A5F]/15 text-[#E07A5F] text-xs font-bold px-3 py-1 rounded-full border border-[#E07A5F]/30 uppercase tracking-wider">
                Restricted Landlord / Admin Panel
              </span>
              <h1 className="text-3xl font-bold text-[var(--foreground)] mt-1">
                Property Management Console
              </h1>
            </div>
          </div>

          <p className="text-[var(--muted)] text-sm mb-6 leading-relaxed">
            This administration portal is guarded by <code className="bg-[var(--background)] text-[#4A6B5D] dark:text-[#6E9885] px-2 py-1 rounded border border-[var(--border)]">JwtAuthGuard</code> and <code className="bg-[var(--background)] text-[#E07A5F] px-2 py-1 rounded border border-[var(--border)]">RolesGuard</code> verifying <code className="text-[#E07A5F]">@Roles('ADMIN')</code>.
          </p>

          {loading ? (
            <div className="p-8 text-center text-[var(--muted)]">
              <div className="w-8 h-8 border-4 border-[#4A6B5D] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Verifying admin credentials...
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-[#E07A5F]/10 border border-[#E07A5F]/30 text-[#E07A5F] text-sm font-medium">
              ❌ {error}
            </div>
          ) : (
            <div className="bg-[var(--background)] p-6 rounded-2xl border border-[var(--border)]">
              <h3 className="text-[#4A6B5D] dark:text-[#6E9885] font-bold mb-3 flex items-center gap-2">
                <span>✅</span> Landlord Server Authorization Successful
              </h3>
              <pre className="text-xs font-mono text-[var(--foreground)] overflow-x-auto bg-[var(--card)] p-4 rounded-xl border border-[var(--border)]">
                {JSON.stringify(adminData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
