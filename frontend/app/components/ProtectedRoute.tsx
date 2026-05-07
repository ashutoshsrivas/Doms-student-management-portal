'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/app/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, token, initializeAuth } = useAuthStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Initialize auth on mount if not already done
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return children;
}
