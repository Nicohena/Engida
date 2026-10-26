'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, AlertCircle } from 'lucide-react';
import { getSafeReturnPath } from '@/lib/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Landing page for the Google Sign-In callback.
 *
 * The backend has verified the Google identity and set the HttpOnly refresh cookie.
 * AuthProvider exchanges the cookie for session access and loads the user profile.
 */
export default function GoogleCallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'working' | 'error'>('working');

  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const nextPath = getSafeReturnPath(params.get('next'), '/dashboard');

    if (user) {
      router.replace(nextPath);
    } else {
      setStatus('error');
      router.replace('/login?error=google_failed');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white border border-[#CBD5E1] p-8 rounded-3xl shadow-lg text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-gradient-to-br from-[#33599E] to-[#234079] flex items-center justify-center text-white">
          {status === 'error' ? (
            <AlertCircle className="w-7 h-7" />
          ) : (
            <Building2 className="w-7 h-7" />
          )}
        </div>

        {status === 'error' ? (
          <>
            <h1 className="text-2xl font-black text-[#000000] mb-2">Sign-in failed</h1>
            <p className="text-sm font-semibold text-[#334155]">
              We could not complete your Google sign-in. Redirecting you to the login page...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-[#000000] mb-2">Signing you in</h1>
            <p className="text-sm font-semibold text-[#334155] mb-5">
              Completing your Google sign-in...
            </p>
            <div className="w-6 h-6 mx-auto border-2 border-[#CBD5E1] border-t-[#33599E] rounded-full animate-spin" />
          </>
        )}
      </div>
    </div>
  );
}
