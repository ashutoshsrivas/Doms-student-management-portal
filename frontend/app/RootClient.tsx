'use client';

import { useEffect, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';

interface RootClientProps {
  children: ReactNode;
}

export default function RootClient({ children }: RootClientProps) {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      {children}
    </>
  );
}
