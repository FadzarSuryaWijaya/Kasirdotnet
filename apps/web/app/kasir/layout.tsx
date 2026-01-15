'use client';

import '@/app/globals.css'; // Import CSS Tailwind
import { Inter } from 'next/font/google'; // Import Font Bawaan Next.js
import { useAuth } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Setup Font Inter
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    const allowedRoles = ['Kasir', 'Admin'];
    if (!user || !allowedRoles.includes(user.role)) {
      router.replace('/login');
      return;
    }
  }, [isAuthenticated, loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-600">Loading POS...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !['Kasir', 'Admin'].includes(user.role)) {
    return null;
  }

  return (
    <div className={`${inter.className} min-h-screen w-full bg-[#f5f7f8] text-[#111418] font-sans`}>
      {/* Trik: Masukkan Link Icon Material Symbols langsung di sini.
        Ini valid di React dan pasti akan di-load browser.
      */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
      />
      
      {children}
    </div>
  );
}