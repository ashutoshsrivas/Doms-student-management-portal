'use client';

// Admin/HOD view for browsing everyone else's schedule and printing PDFs.
// Individual view opens /schedule/print?userId=<id>; bulk download opens
// /schedule/print?all=1 which fetches every schedule and stacks them with
// CSS page breaks so a single "Save as PDF" produces one combined file.

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiPrinter, FiDownload, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

interface UserRow {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  approvedRole: string;
  department?: string | null;
  employeeId?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  HOD: 'HOD',
  FACULTY: 'Faculty',
  CHAIR_HEAD: 'Chair Head',
  COORDINATOR: 'Coordinator',
  PLACEMENT_COORDINATOR: 'Placement Coord.',
  TRAINER: 'Trainer',
  MENTOR: 'Mentor',
};

export default function ScheduleManagePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HOD';

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    (async () => {
      try {
        const { data } = await apiClient.get('/schedule/users');
        setUsers(data.users || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.approvedRole !== roleFilter) return false;
      if (!q) return true;
      const hay = [
        u.firstName, u.lastName || '', u.email,
        u.employeeId || '', u.department || '',
        ROLE_LABEL[u.approvedRole] || u.approvedRole,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, roleFilter]);

  const openIndividual = (userId: string) => {
    window.open(`/schedule/print?userId=${userId}`, '_blank');
  };
  const openAll = () => {
    window.open(`/schedule/print?all=1`, '_blank');
  };

  if (!user || !isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 text-gray-500">Loading…</div>
      </DashboardLayout>
    );
  }

  const roles = Array.from(new Set(users.map((u) => u.approvedRole))).sort();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Faculty Schedules</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View or download any user's weekly schedule.
            </p>
          </div>
          <button
            onClick={openAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiDownload className="w-4 h-4" /> Download all schedules
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, employee ID or department"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg text-sm px-3 py-2"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No users match.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Role</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Department</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Employee ID</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                            <FiUser className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {u.firstName} {u.lastName || ''}
                            </div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                          {ROLE_LABEL[u.approvedRole] || u.approvedRole}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{u.department || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{u.employeeId || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => openIndividual(u.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded-md"
                          title="View & download this schedule"
                        >
                          <FiPrinter className="w-3.5 h-3.5" /> View / PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
