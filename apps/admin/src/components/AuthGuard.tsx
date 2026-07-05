'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

// P-344: 路由级角色保护 — platform_admin 专属路径
const platformOnlyPaths = [
  '/market',
  '/verifications',
  '/community-applications',
  '/banners',
  '/service-providers',
  '/rankings',
  '/reports',
  '/audit-logs',
  '/share',
  '/settings',
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { hydrate, adminUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    hydrate();
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/login');
    } else {
      setHasToken(true);
    }
    setMounted(true);
  }, [hydrate, router]);

  // P-344: committee_admin 访问 platform_admin 专属页面时重定向
  useEffect(() => {
    if (hasToken && adminUser) {
      const role = adminUser.role || 'platform_admin';
      if (role !== 'platform_admin' && platformOnlyPaths.some((p) => pathname.startsWith(p))) {
        router.replace('/dashboard');
      }
    }
  }, [hasToken, adminUser, pathname, router]);

  if (!mounted || !hasToken) return null;

  return <>{children}</>;
}
