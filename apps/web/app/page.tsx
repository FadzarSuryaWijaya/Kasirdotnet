'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/app/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated, otherwise to admin dashboard
    if (authApi.isAuthenticated()) {
      router.push('/admin/categories');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Redirecting...</h1>
      </div>
    </div>
  );
}
