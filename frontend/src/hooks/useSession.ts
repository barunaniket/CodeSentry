'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionUser } from '@/lib/session';

export function useSession(requiredRole?: 'ADMIN' | 'MODERATOR' | 'STUDENT') {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace('/login');
          return;
        }
        if (requiredRole && data.user.role !== requiredRole) {
          // Redirect to their correct dashboard
          if (data.user.role === 'ADMIN') router.replace('/admin/dashboard');
          else if (data.user.role === 'MODERATOR') router.replace('/moderator/dashboard');
          else router.replace('/student/dashboard');
          return;
        }
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  return { user, loading, logout };
}
