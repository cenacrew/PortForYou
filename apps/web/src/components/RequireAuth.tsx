'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';

/** Garde client : redirige vers /login si non connecté (option admin). */
export function RequireAuth({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const t = useTranslations('RequireAuth');
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (admin && !isAdmin) router.replace('/dashboard');
  }, [user, loading, isAdmin, admin, router, pathname]);

  if (loading || !user || (admin && !isAdmin)) {
    return (
      <div className="container section" style={{ textAlign: 'center' }}>
        <p className="cartel">{t('loading')}</p>
      </div>
    );
  }
  return <>{children}</>;
}
