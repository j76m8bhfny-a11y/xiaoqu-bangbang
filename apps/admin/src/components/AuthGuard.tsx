'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, hydrate } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  if (typeof window === 'undefined') return null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (!token) return null;

  return <>{children}</>;
}
