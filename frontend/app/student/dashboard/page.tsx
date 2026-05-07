'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import { FiBook, FiAward, FiCalendar, FiUsers, FiArrowRight } from 'react-icons/fi';

interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface Stats {
  activeSession: Session | null;
  assessmentsPending: number;
  messagesUnread: number;
  achievements: number;
}

function StudentDashboardContent() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    activeSession: null,
    assessmentsPending: 0,
    messagesUnread: 0,
    achievements: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const sessionRes = await apiClient.get('/sessions?isActive=true');
        if (sessionRes.data.sessions && sessionRes.data.sessions.length > 0) {
          setStats((prev) => ({
            ...prev,
            activeSession: sessionRes.data.sessions[0],
          }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const welcomeMessage = user?.firstName ? `Welcome, ${user.firstName}!` : 'Welcome!';

  return (
    <DashboardLayout title={welcomeMessage}>
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100">
          Make the most of your academic journey. Complete your profile, stay updated with assessments, and connect with your mentors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Session</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">
                {stats.activeSession ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiCalendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Assessments</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.assessmentsPending}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FiAward className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Messages</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.messagesUnread}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FiUsers className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Achievements</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.achievements}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FiBook className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {stats.activeSession && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Current Academic Session
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 text-sm">Session Name</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {stats.activeSession.name}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Status</p>
              <p className="text-lg font-semibold text-green-600 mt-1">Active</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Start Date</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {new Date(stats.activeSession.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">End Date</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {new Date(stats.activeSession.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/profile"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                My Profile
              </h3>
              <p className="text-gray-600 text-sm">
                View and update your profile information
              </p>
            </div>
            <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </div>
        </Link>

        <Link
          href="/student/assessments"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                Assessments
              </h3>
              <p className="text-gray-600 text-sm">
                View and complete your assessments
              </p>
            </div>
            <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </div>
        </Link>

        <Link
          href="/student/messages"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                Messages
              </h3>
              <p className="text-gray-600 text-sm">
                Connect with mentors and peers
              </p>
            </div>
            <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
}

export default function StudentDashboard() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <StudentDashboardContent />
    </ProtectedRoute>
  );
}
