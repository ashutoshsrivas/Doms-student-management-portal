'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/app/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();

  // Wait for user to be loaded with required properties
  const isUserLoaded = user && user.role;

  useEffect(() => {
    // Skip if still loading
    if (!isUserLoaded && (isAuthenticated || token)) {
      // Still waiting for user data to load
      return;
    }

    // Check if user has access
    if (!isAuthenticated && !token) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated && user) {
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isUserLoaded, isAuthenticated, token, user?.role, router, requiredRoles]);

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
