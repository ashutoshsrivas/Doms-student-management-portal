'use client';

import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useAuthStore from '@/app/store/authStore';
import StudentRoadmap from './StudentRoadmap';
import StaffRoadmap from './StaffRoadmap';
import './roadmap.css';

function Content() {
  const { user } = useAuthStore();
  // One page, two jobs: a student walks their own timeline, staff approve
  // goals and place milestones on a whole session's.
  return user?.role === 'STUDENT' ? <StudentRoadmap /> : <StaffRoadmap />;
}

export default function RoadmapPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto w-full min-w-0 max-w-6xl p-4 sm:p-6">
          <Content />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
