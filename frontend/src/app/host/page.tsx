'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /host redirects immediately to /host/dashboard.
 */
export default function HostIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/host/dashboard');
  }, [router]);

  return null;
}
