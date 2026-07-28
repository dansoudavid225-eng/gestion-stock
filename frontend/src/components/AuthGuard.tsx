'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/products',
  '/sales',
  '/credits',
  '/rapports',
  '/params',
  '/customers',
  '/inventory',
  '/users',
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!loading && isProtected && !user) {
      router.replace('/');
    }
  }, [loading, isProtected, user, router]);

  if (isProtected && (loading || !user)) {
    return null;
  }

  return <>{children}</>;
}
