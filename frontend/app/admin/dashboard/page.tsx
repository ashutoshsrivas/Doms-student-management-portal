'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiTrendingUp,
  FiArrowRight,
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
  response?: { data?: { message?: string } };
  message?: string;
}

function RingChart({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;
  const offset = circ * (1 - pct);
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(60,60,67,0.08)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-bold text-gray-900 leading-none">{value}</span>
        <span className="text-[9px] text-[rgba(60,60,67,0.4)] font-medium mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, pendingRequests: 0, activeSessions: 0, totalSessions: 0 });
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<{ [userId: string]: string }>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        activeSessions: sessionsRes.data.sessions.filter((s: Session) => s.isActive).length,
        totalSessions: sessionsRes.data.total,
      });
      setPendingUsers(pendingRes.data.users);
    } catch {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleApproveUser = async (userId: string, role: string) => {
    if (!role) { toast.error('Please select a role'); return; }
    setApproving(userId);
    try {
      await apiClient.post('/auth/approve-user', { userId, approvedRole: role });
      toast.success('User approved successfully');
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedRoles((prev) => { const u = { ...prev }; delete u[userId]; return u; });
    } catch (error) {
      toast.error((error as AxiosError).response?.data?.message || 'Failed to approve user');
    } finally { setApproving(null); }
  };

  const handleRejectUser = async (userId: string) => {
    setApproving(userId);
    try {
      await apiClient.post('/auth/reject-user', { userId, reason: 'Admin decision' });
      toast.success('User rejected');
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      toast.error((error as AxiosError).response?.data?.message || 'Failed to reject user');
    } finally { setApproving(null); }
  };

  const pendingByRole = pendingUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.requestedRole] = (acc[u.requestedRole] || 0) + 1;
    return acc;
  }, {});
  const maxRoleCount = Math.max(...Object.values(pendingByRole), 1);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <FiUsers className="w-4 h-4" />, iconBg: 'bg-blue-50', iconColor: 'text-[#007AFF]', valueColor: 'text-gray-900' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: <FiClock className="w-4 h-4" />, iconBg: 'bg-amber-50', iconColor: 'text-[#FF9500]', valueColor: 'text-[#FF9500]' },
    { label: 'Active Sessions', value: stats.activeSessions, icon: <FiCalendar className="w-4 h-4" />, iconBg: 'bg-green-50', iconColor: 'text-[#34C759]', valueColor: 'text-gray-900' },
    { label: 'Total Sessions', value: stats.totalSessions, icon: <FiTrendingUp className="w-4 h-4" />, iconBg: 'bg-purple-50', iconColor: 'text-[#AF52DE]', valueColor: 'text-gray-900' },
  ];

  return (
    <DashboardLayout title={`Welcome back, ${user?.firstName}!`}>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-[rgba(60,60,67,0.07)] shadow-sm animate-slide-up"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <div className={`w-9 h-9 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className={`text-[26px] font-bold leading-none mb-1 ${card.valueColor}`}>
              {loading ? '—' : card.value}
            </p>
            <p className="text-[11px] font-medium text-[rgba(60,60,67,0.5)]">{card.label}</p>
          </div>
        ))}
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-slide-up" style={{ animationDelay: '200ms' }}>

        {/* Sessions ring */}
        <div className="bg-white rounded-2xl p-6 border border-[rgba(60,60,67,0.07)] shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(60,60,67,0.4)] mb-1">Overview</p>
          <h3 className="text-[15px] font-bold text-gray-900 mb-5">Session Activity</h3>
          <div className="flex items-center gap-6">
            <RingChart value={stats.activeSessions} total={Math.max(stats.totalSessions, 1)} color="#34C759" label="active" />
            <div className="space-y-3 flex-1">
              {[
                { label: 'Active', value: stats.activeSessions, color: '#34C759', barColor: 'bg-[#34C759]' },
                { label: 'Inactive', value: Math.max(0, stats.totalSessions - stats.activeSessions), color: 'rgba(60,60,67,0.2)', barColor: 'bg-[rgba(60,60,67,0.18)]' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="text-[13px] font-medium text-gray-700">{row.label}</span>
                    </div>
                    <span className="text-[13px] font-bold text-gray-900">{row.value}</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(60,60,67,0.07)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.barColor} rounded-full`}
                      style={{ width: stats.totalSessions > 0 ? `${(row.value / stats.totalSessions) * 100}%` : '0%', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-[rgba(60,60,67,0.4)] pt-1 border-t border-[rgba(60,60,67,0.07)]">
                {stats.totalSessions} sessions total
              </p>
            </div>
          </div>
        </div>

        {/* Pending by role */}
        <div className="bg-white rounded-2xl p-6 border border-[rgba(60,60,67,0.07)] shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(60,60,67,0.4)] mb-1">Approvals</p>
          <h3 className="text-[15px] font-bold text-gray-900 mb-5 flex items-center gap-2">
            Pending by Role
            {stats.pendingRequests > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[#FF9500] text-white rounded-full">
                {stats.pendingRequests}
              </span>
            )}
          </h3>
          {Object.keys(pendingByRole).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center mb-2">
                <FiCheckCircle className="w-5 h-5 text-[#34C759]" />
              </div>
              <p className="text-[13px] font-medium text-[rgba(60,60,67,0.5)]">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {Object.entries(pendingByRole).map(([role, count]) => (
                <div key={role}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-gray-700">{role.replace('_', ' ')}</span>
                    <span className="text-[12px] font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(60,60,67,0.07)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#007AFF] rounded-full"
                      style={{ width: `${(count / maxRoleCount) * 100}%`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { href: '/admin/users', icon: <FiUsers className="w-4 h-4" />, iconBg: 'bg-blue-50', iconColor: 'text-[#007AFF]', title: 'Manage Users', desc: 'View, edit, and manage all system users' },
          { href: '/admin/sessions', icon: <FiCalendar className="w-4 h-4" />, iconBg: 'bg-green-50', iconColor: 'text-[#34C759]', title: 'Academic Sessions', desc: 'Create and manage academic sessions' },
          { href: '/admin/settings', icon: <FiTrendingUp className="w-4 h-4" />, iconBg: 'bg-purple-50', iconColor: 'text-[#AF52DE]', title: 'System Settings', desc: 'Configure system-wide settings' },
        ].map((card, i) => (
          <Link
            key={i}
            href={card.href}
            className="bg-white rounded-2xl p-5 border border-[rgba(60,60,67,0.07)] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-start gap-4"
          >
            <div className={`w-9 h-9 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-0.5">{card.title}</h3>
              <p className="text-[12px] text-[rgba(60,60,67,0.5)]">{card.desc}</p>
            </div>
            <FiArrowRight className="w-4 h-4 text-[rgba(60,60,67,0.25)] group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>

      {/* Pending Users Table */}
      <div className="bg-white rounded-2xl border border-[rgba(60,60,67,0.07)] shadow-sm overflow-hidden animate-fade-in">
        <div className="px-6 py-5 border-b border-[rgba(60,60,67,0.08)]">
          <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            Pending User Requests
            {stats.pendingRequests > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[#FF9500] text-white rounded-full">
                {stats.pendingRequests}
              </span>
            )}
          </h2>
          <p className="text-[12px] text-[rgba(60,60,67,0.5)] mt-0.5">Review and approve or reject pending requests</p>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
              <FiCheckCircle className="w-6 h-6 text-[#34C759]" />
            </div>
            <p className="text-[14px] font-medium text-gray-600">All caught up!</p>
            <p className="text-[12px] text-[rgba(60,60,67,0.4)] mt-1">No pending requests right now</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f2f2f7]">
                <tr>
                  {['Name', 'Email', 'Requested Role', 'Applied On', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-[rgba(60,60,67,0.5)] uppercase tracking-[0.1em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(60,60,67,0.06)]">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[rgba(0,122,255,0.02)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden shadow-sm">
                          {u.profileImage
                            ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                            : `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase()}
                        </div>
                        <p className="text-[13px] font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-[rgba(60,60,67,0.6)]">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className="inline-block bg-[rgba(0,122,255,0.1)] text-[#007AFF] px-2.5 py-1 rounded-full text-[11px] font-semibold">
                        {u.requestedRole}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-[rgba(60,60,67,0.6)]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedRoles[u.id] || ''}
                          onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          className="text-[12px] bg-[#f2f2f7] border-0 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 text-gray-900"
                          disabled={approving === u.id}
                        >
                          <option value="">Select role</option>
                          <option value="ADMIN">Admin</option>
                          <option value="HOD">HOD</option>
                          <option value="FACULTY">Faculty</option>
                          <option value="COORDINATOR">Coordinator</option>
                          <option value="PLACEMENT_COORDINATOR">Placement Coord.</option>
                          <option value="TRAINER">Trainer</option>
                          <option value="STUDENT">Student</option>
                          <option value="MENTOR">Mentor</option>
                        </select>
                        <button
                          onClick={() => handleApproveUser(u.id, selectedRoles[u.id] || '')}
                          disabled={approving === u.id || !selectedRoles[u.id]}
                          className="bg-[#34C759] hover:bg-[#2EB84F] disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                        >
                          {approving === u.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectUser(u.id)}
                          disabled={approving === u.id}
                          className="bg-[rgba(255,59,48,0.1)] hover:bg-[rgba(255,59,48,0.18)] disabled:opacity-40 text-[#FF3B30] px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
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
