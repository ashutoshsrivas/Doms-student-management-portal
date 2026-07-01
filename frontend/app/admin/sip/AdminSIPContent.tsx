'use client';

import { useState, useEffect, useMemo } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';
import { exportAllSIPsToExcel } from '@/app/lib/exportUtils';
import { FiSearch } from 'react-icons/fi';

type SIPRow = {
  id: string;
  studentName?: string;
  enrollmentNo?: string;
  companyName?: string;
  jobRole?: string;
  sipLocation?: string;
  stipend?: string | number;
  status?: string;
  joinDate?: string;
  completionDate?: string;
  [key: string]: unknown;
};

type StatusFilter = 'all' | 'PENDING' | 'COMPLETED';

export default function AdminSIPContent() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<{ id: string; name: string; isActive?: boolean; sipEnabled?: boolean; startDate?: string; endDate?: string }[]>([]);
  const [sips, setSips] = useState<SIPRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingSession, setTogglingSession] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionsResponse = await apiClient.get('/sessions?page=1&limit=100');
        const allSessions = sessionsResponse.data.sessions || [];
        setSessions(allSessions);

        if (allSessions.length > 0) {
          const firstSession = allSessions[0];
          setSelectedSessionId(firstSession.id);

          const sipsResponse = await apiClient.get(`/sip/session/${firstSession.id}`);
          setSips(sipsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSessionChange = async (sessionId: string) => {
    try {
      setSelectedSessionId(sessionId);
      // Reset column filters so a stale selection from the previous
      // session doesn't hide all rows in the new one.
      setStatusFilter('all');
      setCompanyFilter('');
      setRoleFilter('');
      setLocationFilter('');
      const sipsResponse = await apiClient.get(`/sip/session/${sessionId}`);
      setSips(sipsResponse.data);
    } catch (error) {
      console.error('Error fetching SIPs:', error);
      toast.error('Failed to load SIPs for this session');
    }
  };

  const handleToggleSIP = async (sessionId: string, currentState: boolean) => {
    try {
      setTogglingSession(sessionId);
      const newState = !currentState;
      const response = await apiClient.put(`/sessions/${sessionId}`, { sipEnabled: newState });
      const updatedSessionResponse = await apiClient.get(`/sessions?page=1&limit=100`);
      const updatedSessions: { id: string; name: string; isActive?: boolean; sipEnabled?: boolean; startDate?: string; endDate?: string }[] = updatedSessionResponse.data.sessions || [];
      setSessions(updatedSessions);
      const updatedSession = updatedSessions.find((s) => s.id === sessionId);

      if (updatedSession?.sipEnabled === newState) {
        toast.success(`SIP ${newState ? 'enabled' : 'disabled'} for this session`);
      } else {
        toast.error('Failed to update SIP status - please try again');
      }
    } catch (error) {
      console.error('Error toggling SIP:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to update SIP status');
    } finally {
      setTogglingSession(null);
    }
  };

  // Hooks must run on every render — keep useMemo above any early return.
  const uniqueValues = (key: keyof SIPRow) => {
    const set = new Set<string>();
    sips.forEach((s) => {
      const v = (s[key] as string | undefined)?.trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };
  const companyOptions = useMemo(() => uniqueValues('companyName'), [sips]);
  const roleOptions = useMemo(() => uniqueValues('jobRole'), [sips]);
  const locationOptions = useMemo(() => uniqueValues('sipLocation'), [sips]);

  const filteredSips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sips.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (companyFilter && (s.companyName || '') !== companyFilter) return false;
      if (roleFilter && (s.jobRole || '') !== roleFilter) return false;
      if (locationFilter && (s.sipLocation || '') !== locationFilter) return false;
      if (!q) return true;
      const name = (s.studentName || '').toLowerCase();
      const enrol = (s.enrollmentNo || '').toLowerCase();
      const company = (s.companyName || '').toLowerCase();
      const role = (s.jobRole || '').toLowerCase();
      const loc = (s.sipLocation || '').toLowerCase();
      return name.includes(q) || enrol.includes(q) || company.includes(q) || role.includes(q) || loc.includes(q);
    });
  }, [sips, search, statusFilter, companyFilter, roleFilter, locationFilter]);

  if (loading) return <div className="text-center py-8 text-gray-900 font-bold">Loading...</div>;

  const currentSession = sessions.find(s => s.id === selectedSessionId);
  const pendingCount = sips.filter((s) => s.status === 'PENDING').length;
  const completedCount = sips.filter((s) => s.status === 'COMPLETED').length;

  return (
    <DashboardLayout title="Internship (SIP) Management">
      <div className="space-y-6">
        {/* Session Selection and SIP Toggle */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-700">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Session Management</h3>
          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between border-2 border-gray-300 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-400 transition">
                <div
                  onClick={() => handleSessionChange(session.id)}
                  className="flex-1 cursor-pointer"
                >
                  <p className="font-bold text-gray-900 text-base">{session.name}</p>
                  <p className="text-gray-700 text-sm font-semibold">
                    {session.startDate ? new Date(session.startDate).toLocaleDateString() : '—'} - {session.endDate ? new Date(session.endDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleSIP(session.id, !!session.sipEnabled)}
                  disabled={togglingSession === session.id}
                  className={`px-6 py-2 rounded font-bold text-white text-base transition ${
                    session.sipEnabled
                      ? 'bg-red-700 hover:bg-red-800'
                      : 'bg-green-700 hover:bg-green-800'
                  } disabled:opacity-50`}
                >
                  {togglingSession === session.id ? 'Updating...' : session.sipEnabled ? 'Disable SIP' : 'Enable SIP'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SIP Submissions for Selected Session */}
        {currentSession && (
          <>
            <div className="bg-blue-100 border-2 border-blue-800 rounded-lg p-4 shadow">
              <p className="text-blue-900 font-bold text-base">
                <span className="text-lg">{currentSession.name}</span>
                {' - SIP is '}
                <span className={currentSession.sipEnabled ? 'text-green-700 font-extrabold text-lg' : 'text-red-700 font-extrabold text-lg'}>
                  {currentSession.sipEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-4 sm:p-6 border-b-2 border-gray-300 flex flex-wrap justify-between items-start gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">SIP Submissions</h3>
                  <p className="text-gray-700 text-sm sm:text-base font-semibold mt-1">
                    Showing {filteredSips.length} of {sips.length} students
                  </p>
                </div>
                {sips.length > 0 && (
                  <button
                    onClick={() => exportAllSIPsToExcel(filteredSips, currentSession.name)}
                    className="bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded font-bold hover:bg-green-800 text-sm sm:text-base whitespace-nowrap"
                  >
                    Export to Excel
                  </button>
                )}
              </div>

              {sips.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-900 font-bold text-base">
                    {currentSession.sipEnabled
                      ? 'No SIP forms submitted yet'
                      : 'SIP is disabled for this session'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Filter bar */}
                  <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, enrolment, company, role, or location…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {([
                        ['all', 'All', sips.length],
                        ['PENDING', 'Pending', pendingCount],
                        ['COMPLETED', 'Completed', completedCount],
                      ] as [StatusFilter, string, number][]).map(([k, label, count]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setStatusFilter(k)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                            statusFilter === k
                              ? 'bg-gray-900 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {label} <span className="opacity-70">({count})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredSips.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">No submissions match the current filter.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[860px] w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold text-gray-900">Student</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-900">Company</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-900">Role</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-900">Location</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-900">Stipend</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-900">Join</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-900">Status</th>
                            <th className="px-4 py-3 text-right font-bold text-gray-900"> </th>
                          </tr>
                          <tr className="bg-gray-50 border-b-2 border-gray-300">
                            <th className="px-4 py-2 text-left font-normal text-gray-500 text-xs italic">— any —</th>
                            <th className="px-4 py-2">
                              <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full min-w-[130px] rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              >
                                <option value="">All companies</option>
                                {companyOptions.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </th>
                            <th className="px-4 py-2">
                              <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full min-w-[120px] rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              >
                                <option value="">All roles</option>
                                {roleOptions.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </th>
                            <th className="px-4 py-2">
                              <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="w-full min-w-[120px] rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              >
                                <option value="">All locations</option>
                                {locationOptions.map((l) => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                            </th>
                            <th className="px-4 py-2 text-left font-normal text-gray-500 text-xs italic">—</th>
                            <th className="px-4 py-2 text-left font-normal text-gray-500 text-xs italic">—</th>
                            <th className="px-4 py-2">
                              <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                className="w-full min-w-[100px] rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              >
                                <option value="all">All</option>
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                              </select>
                            </th>
                            <th className="px-4 py-2 text-right">
                              {(companyFilter || roleFilter || locationFilter || statusFilter !== 'all') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCompanyFilter('');
                                    setRoleFilter('');
                                    setLocationFilter('');
                                    setStatusFilter('all');
                                  }}
                                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                                >
                                  Clear
                                </button>
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredSips.map(sip => (
                            <tr key={sip.id} className="hover:bg-blue-50 transition align-top">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">{sip.studentName || 'N/A'}</div>
                                {sip.enrollmentNo ? (
                                  <div className="text-xs text-gray-500 mt-0.5">{sip.enrollmentNo}</div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">{sip.companyName || <span className="text-gray-400">—</span>}</td>
                              <td className="px-4 py-3 text-gray-800">{sip.jobRole || <span className="text-gray-400">—</span>}</td>
                              <td className="px-4 py-3 text-gray-800">{sip.sipLocation || <span className="text-gray-400">—</span>}</td>
                              <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{sip.stipend ? `₹ ${sip.stipend}` : <span className="text-gray-400">—</span>}</td>
                              <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                                {sip.joinDate ? new Date(sip.joinDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                                    sip.status === 'COMPLETED'
                                      ? 'bg-green-100 text-green-900 border border-green-300'
                                      : 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                                  }`}
                                >
                                  {sip.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <Link
                                  href={`/admin/sip/${sip.id}`}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-700">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Manage Requirements</h3>
              <Link href="/admin/sip-requirements" className="text-blue-700 hover:text-blue-900 font-bold underline text-base">
                Post and manage internship requirements →
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
