import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  // Vendors who haven't completed their profile must finish onboarding first
  if (profile && !profile.full_name && !profile.store_name && loc.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function FullLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}
