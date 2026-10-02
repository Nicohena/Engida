'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const isPropertyDetailsPage = pathname.startsWith('/properties/');
  // Host area manages its own sidebar layout — bypass the public shell entirely
  const isHostArea = pathname.startsWith('/host');

  if (isLandingPage || isPropertyDetailsPage || isHostArea) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </>
  );
}
