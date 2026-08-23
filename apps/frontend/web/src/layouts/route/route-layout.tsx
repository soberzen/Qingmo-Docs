import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { LumaSpin } from '@/components/ui/luma-spin';
import { useAuthStore } from '@/stores/auth/use-auth';

const PageLoading = () => {
  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-background'>
      <LumaSpin />
    </div>
  );
};

export default function RootRoute() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Outlet />
    </Suspense>
  );
}

export function ProtectRoute() {
  const loading = useAuthStore((state) => state.loading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (loading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    );
  }

  return <Outlet />;
}

export function GuestRoute() {
  const loading = useAuthStore((state) => state.loading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const location = useLocation();

  if (loading) return <PageLoading />;

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('redirect') || '/';
    return (
      <Navigate
        to={redirectPath}
        replace
      />
    );
  }
  return <Outlet />;
}
