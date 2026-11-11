'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/app/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  // Checked against the real approved role, not the aliased one, so a
  // COORDINATOR (aliased to ADMIN) can be excluded from admin-only screens.
  deniedRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles = [], deniedRoles = [] }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, token, authReady } = useAuthStore();
  const rawRole = (user as { approvedRole?: string } | null)?.approvedRole;

  // Wait for user to be loaded with required properties
  const isUserLoaded = user && user.role;

  // A cold load — a refresh, a bookmark, a link opened in a new tab — starts
  // with an empty store. The token lives in a cookie and the user in local
  // storage, and neither has been read back yet when this component first
  // runs: effects fire child-first, so this one goes off before the root's
  // initializeAuth. Judging the session at that moment sent a signed-in
  // person to the sign-in page, so nothing is decided until the restore has
  // finished one way or the other.
  const restoring = !authReady || (!isUserLoaded && (isAuthenticated || token));

  useEffect(() => {
    // Skip while the session is still being put back together
    if (restoring) {
      return;
    }

    // Check if user has access
    if (!isAuthenticated && !token) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated && user) {
      if (deniedRoles.length > 0 && rawRole && deniedRoles.includes(rawRole)) {
        router.push('/unauthorized');
        return;
      }
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [restoring, isAuthenticated, token, user?.role, rawRole, router, requiredRoles, deniedRoles]);

  if (restoring) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f2f2f7]">
        <div className="text-center animate-fade-in">
          <div className="relative w-11 h-11 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[rgba(0,122,255,0.12)]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#007AFF] animate-spin" />
          </div>
          <p className="text-[13px] text-[rgba(60,60,67,0.45)] font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return children;
}
