'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/app/store/authStore';
import usePermissions from '@/app/lib/usePermissions';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Legacy: list of base roles that may access the route. */
  requiredRoles?: string[];
  /**
   * Optional: a permission key. If the user has this permission (via role
   * default, custom role, or per-user override), they're allowed in
   * regardless of their base role. Set this on admin-tier pages so the
   * Roles & Permissions grid actually controls access.
   */
  requiredPerm?: string;
}

export default function ProtectedRoute({ children, requiredRoles = [], requiredPerm }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const { loaded: permsLoaded, hasPerm } = usePermissions();

  // Wait for user to be loaded with required properties
  const isUserLoaded = user && user.role;

  useEffect(() => {
    // Still loading user data — wait
    if (!isUserLoaded && (isAuthenticated || token)) return;

    // Not logged in
    if (!isAuthenticated && !token) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated && user) {
      const roleOK = requiredRoles.length === 0 || requiredRoles.includes(user.role);
      // If the page also offers a permission gate, wait for perms to load
      // before deciding (avoids a flash-redirect for users who hold the
      // perm via override).
      if (!roleOK && requiredPerm && !permsLoaded) return;
      const permOK = requiredPerm ? hasPerm(requiredPerm) : false;
      if (!roleOK && !permOK) {
        router.push('/unauthorized');
      }
    }
  }, [isUserLoaded, isAuthenticated, token, user?.role, router, requiredRoles, requiredPerm, permsLoaded, hasPerm]);

  if (!isUserLoaded && (isAuthenticated || token)) {
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
