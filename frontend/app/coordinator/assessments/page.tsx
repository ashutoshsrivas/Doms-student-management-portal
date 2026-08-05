'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';

export default function CoordinatorAssessmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      return;
    }

    // Coordinator role is aliased to ADMIN at the auth boundary — always bounce
    // to the shared /admin/assessments page, which enforces the real allowlist.
    router.push('/admin/assessments');
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading assessments...</p>
      </div>
    </div>
  );
}
