'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCalendar,
  FiTrendingUp,
} from 'react-icons/fi';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  requestedRole: string;
  createdAt: string;
  profileImage?: string;
}

interface Session {
  id: string;
  name: string;
  isActive: boolean;
}

interface Stats {
  totalUsers: number;
  pendingRequests: number;
  activeSessions: number;
  totalSessions: number;
}

interface AxiosError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

function AdminDashboardContent() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingRequests: 0,
    activeSessions: 0,
    totalSessions: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<{ [userId: string]: string }>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [pendingRes, usersRes, sessionsRes] = await Promise.all([
        apiClient.get('/auth/pending-requests'),
        apiClient.get('/users?limit=1'),
        apiClient.get('/sessions'),
      ]);

      setStats({
        totalUsers: usersRes.data.total,
        pendingRequests: pendingRes.data.count,
        activeSessions: sessionsRes.data.sessions.filter((s: Session) => s.isActive)
          .length,
        totalSessions: sessionsRes.data.total,
      });

      setPendingUsers(pendingRes.data.users);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string, role: string) => {
    if (!role) {
      toast.error('Please select a role');
      return;
    }

    setApproving(userId);
    try {
      await apiClient.post('/auth/approve-user', {
        userId,
        approvedRole: role,
      });

      toast.success('User approved successfully');
      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      setSelectedRoles((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      toast.error(
        axiosError.response?.data?.message || 'Failed to approve user'
      );
    } finally {
      setApproving(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setApproving(userId);
    try {
      await apiClient.post('/auth/reject-user', {
        userId,
        reason: 'Admin decision',
      });

      toast.success('User rejected');
      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
    } catch (error) {
      const axiosError = error as AxiosError;
      toast.error(axiosError.response?.data?.message || 'Failed to reject user');
    } finally {
      setApproving(null);
    }
  };

  return (
    <DashboardLayout title={`Admin Dashboard - Welcome ${user?.firstName}!`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalUsers}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiUsers className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Pending Requests
              </p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.pendingRequests}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FiClock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Active Sessions
              </p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.activeSessions}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FiCalendar className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Total Sessions
              </p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalSessions}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FiTrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <a
          href="/admin/users"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Manage Users
          </h3>
          <p className="text-gray-600 text-sm">
            View, edit, and manage all system users
          </p>
        </a>

        <a
          href="/admin/sessions"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Academic Sessions
          </h3>
          <p className="text-gray-600 text-sm">
            Create and manage academic sessions
          </p>
        </a>

        <a
          href="/admin/settings"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            System Settings
          </h3>
          <p className="text-gray-600 text-sm">
            Configure system-wide settings and policies
          </p>
        </a>
      </div>

      {/* Pending Requests */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Pending User Requests ({stats.pendingRequests})
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Review and approve/reject pending user requests
          </p>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-12 text-center">
            <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">No pending requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Requested Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Applied On
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
                          )}
                        </div>
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {user.requestedRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <select
                          value={selectedRoles[user.id] || ''}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="text-xs border-2 border-gray-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                          disabled={approving === user.id}
                        >
                          <option value="">Select role</option>
                          <option value="ADMIN">Admin</option>
                          <option value="HOD">HOD</option>
                          <option value="FACULTY">Faculty</option>
                          <option value="COORDINATOR">Coordinator</option>
                          <option value="PLACEMENT_COORDINATOR">
                            Placement Coordinator
                          </option>
                          <option value="TRAINER">Trainer</option>
                          <option value="STUDENT">Student</option>
                          <option value="MENTOR">Mentor</option>
                        </select>
                        <button
                          onClick={() =>
                            handleApproveUser(user.id, selectedRoles[user.id] || '')
                          }
                          disabled={approving === user.id || !selectedRoles[user.id]}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-xs font-medium transition"
                        >
                          {approving === user.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          disabled={approving === user.id}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-xs font-medium transition"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN']}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
