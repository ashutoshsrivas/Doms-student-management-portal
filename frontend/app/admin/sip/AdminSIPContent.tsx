'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';
import Link from 'next/link';
import { exportAllSIPsToExcel } from '@/app/lib/exportUtils';

export default function AdminSIPContent() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<{ id: string; name: string; isActive?: boolean; sipEnabled?: boolean; startDate?: string; endDate?: string }[]>([]);
  const [sips, setSips] = useState<{
    id: string;
    studentName?: string;
    companyName?: string;
    sipLocation?: string;
    status?: string;
    [key: string]: unknown;
  }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingSession, setTogglingSession] = useState<string | null>(null);

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

  if (loading) return <div className="text-center py-8 text-gray-900 font-bold">Loading...</div>;

  const currentSession = sessions.find(s => s.id === selectedSessionId);

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
              <div className="p-6 border-b-2 border-gray-300 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">SIP Submissions</h3>
                  <p className="text-gray-700 text-base font-semibold mt-1">{sips.length} students have submitted</p>
                </div>
                {sips.length > 0 && (
                  <button
                    onClick={() => exportAllSIPsToExcel(sips, currentSession.name)}
                    className="bg-green-700 text-white px-6 py-3 rounded font-bold hover:bg-green-800 text-base whitespace-nowrap"
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-base font-bold text-gray-900 border-b-2 border-gray-400">Student Name</th>
                        <th className="px-6 py-3 text-left text-base font-bold text-gray-900 border-b-2 border-gray-400">Company</th>
                        <th className="px-6 py-3 text-left text-base font-bold text-gray-900 border-b-2 border-gray-400">Location</th>
                        <th className="px-6 py-3 text-left text-base font-bold text-gray-900 border-b-2 border-gray-400">Status</th>
                        <th className="px-6 py-3 text-left text-base font-bold text-gray-900 border-b-2 border-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-300">
                      {sips.map(sip => (
                        <tr key={sip.id} className="hover:bg-blue-50 transition">
                          <td className="px-6 py-4 text-base font-semibold text-gray-900">{sip.studentName || 'N/A'}</td>
                          <td className="px-6 py-4 text-base font-semibold text-gray-900">{sip.companyName || 'N/A'}</td>
                          <td className="px-6 py-4 text-base font-semibold text-gray-900">{sip.sipLocation || 'N/A'}</td>
                          <td className="px-6 py-4 text-base">
                            <span
                              className={`px-4 py-2 rounded-full text-base font-bold ${
                                sip.status === 'COMPLETED'
                                  ? 'bg-green-200 text-green-900'
                                  : 'bg-yellow-200 text-yellow-900'
                              }`}
                            >
                              {sip.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-base">
                            <Link href={`/admin/sip/${sip.id}`} className="text-blue-700 hover:text-blue-900 font-bold underline">
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
