'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function CoordinatorDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    // Verify user is PLACEMENT_COORDINATOR
    if (user && user.role !== 'PLACEMENT_COORDINATOR') {
      router.push('/unauthorized');
    }
  }, [user, router]);

  if (!user || user.role !== 'PLACEMENT_COORDINATOR') {
    return null;
  }

  return (
    <DashboardLayout title="Placement Coordinator Dashboard">
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Placement Coordinator Dashboard</h1>
          <p className="text-gray-600 mb-8">Welcome, {user.firstName} {user.lastName}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-blue-600">Manage Sessions</h2>
              <p className="text-gray-600 mt-2">Create and manage placement sessions</p>
              <button
                onClick={() => router.push('/coordinator/sessions')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Sessions
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-green-600">Manage Assessments</h2>
              <p className="text-gray-600 mt-2">Create and manage your assessments</p>
              <button
                onClick={() => router.push('/coordinator/assessments')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Assessments
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-orange-600">View Profile</h2>
              <p className="text-gray-600 mt-2">Manage your profile information</p>
              <button
                onClick={() => router.push('/profile')}
                className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
