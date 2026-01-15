'use client';

import { useAuth, logout } from '@/app/lib/auth';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, user } = useAuth();

  // Protect admin routes: must be authenticated and have Admin role
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user?.role !== 'Admin') {
      router.replace('/kasir');
      return;
    }
  }, [isAuthenticated, loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
        <div className="text-lg text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'Admin') {
    return null;
  }


  return (
    // Gunakan Flex Container
    <div className="flex min-h-screen bg-[#f8fafc]">
      
      {/* Sidebar (State width diurus internal komponen) */}
      <Sidebar />

      {/* Main Content (Flex-1 akan otomatis mengisi sisa ruang) */}
      <main className="flex-1 overflow-auto h-screen">
        {/* Header kamu di sini */}
        {/* <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b px-8 py-4"> */}
           {/* ... isi header ... */}
        {/* </header> */}

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}