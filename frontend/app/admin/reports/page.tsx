'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiDownload, FiFileText, FiGrid, FiLoader, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import { exportToExcel, exportToPDF, type ReportPayload } from '@/app/lib/reportExports';

interface ReportType {
  key: string;
  title: string;
  description: string;
  requiresSession: boolean;
  path: string;
}

interface SessionItem {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [reports, setReports] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, sessionsRes] = await Promise.all([
        apiClient.get('/reports/types'),
        apiClient.get('/reports/sessions'),
      ]);
      setReports(typesRes.data.reports || []);
      const ses: SessionItem[] = sessionsRes.data.sessions || [];
      setSessions(ses);
      const active = ses.find((s) => s.isActive);
      setSelectedSessionId((prev) => prev || active?.id || ses[0]?.id || '');
    } catch (err) {
      console.error('Failed to load report catalog:', err);
      toast.error('Failed to load reports catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadCatalog();
  }, [user, router, loadCatalog]);

  const fetchReport = useCallback(
    async (r: ReportType): Promise<ReportPayload | null> => {
      try {
        const params: Record<string, string> = {};
        if (r.requiresSession) {
          if (!selectedSessionId) {
            toast.error('Pick a session first');
            return null;
          }
          params.sessionId = selectedSessionId;
        }
        // r.path is "/api/reports/X"; apiClient already has /api as baseURL,
        // so strip the leading "/api" before calling.
        const relPath = r.path.replace(/^\/api/, '');
        const res = await apiClient.get(relPath, { params });
        return res.data as ReportPayload;
      } catch (err: unknown) {
        console.error('Report fetch failed:', err);
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(e.response?.data?.message || 'Failed to generate report');
        return null;
      }
    },
    [selectedSessionId],
  );

  const onDownload = async (r: ReportType, format: 'xlsx' | 'pdf') => {
    const key = `${r.key}:${format}`;
    setBusyKey(key);
    const t = toast.loading(`Generating ${format.toUpperCase()}…`);
    try {
      const data = await fetchReport(r);
      if (!data) return;
      if (format === 'xlsx') exportToExcel(data);
      else exportToPDF(data);
      toast.success(`${r.title} — ${data.meta.rowCount} rows`, { id: t });
    } catch (err) {
      console.error(err);
      toast.error('Failed to build file', { id: t });
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <FiLoader className="animate-spin text-blue-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  const activeSession = sessions.find((s) => s.id === selectedSessionId) || null;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-1">
              Export data from the portal as Excel or PDF. All reports are admin-only.
            </p>
          </div>

          {/* Session picker */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-4">
            <label className="font-semibold text-gray-900">Session:</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[260px]"
            >
              {sessions.length === 0 ? (
                <option value="">No sessions found</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isActive ? '  (active)' : ''}
                  </option>
                ))
              )}
            </select>
            {activeSession && (activeSession.startDate || activeSession.endDate) && (
              <span className="text-sm text-gray-600">
                {activeSession.startDate ? new Date(activeSession.startDate).toLocaleDateString() : '—'}
                {' → '}
                {activeSession.endDate ? new Date(activeSession.endDate).toLocaleDateString() : '—'}
              </span>
            )}
            <span className="ml-auto text-xs text-gray-500">
              Session-scoped reports use this; the &quot;All Users&quot; report ignores it.
            </span>
          </div>

          {/* Empty session state */}
          {sessions.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <FiAlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900">No academic sessions yet</p>
                <p className="text-yellow-800 mt-1">
                  Create a session in <span className="font-mono">Admin → Sessions</span> first.
                  Session-scoped reports will be empty until students are enrolled.
                </p>
              </div>
            </div>
          )}

          {/* Reports grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((r) => {
              const disabled = r.requiresSession && !selectedSessionId;
              const busyXlsx = busyKey === `${r.key}:xlsx`;
              const busyPdf = busyKey === `${r.key}:pdf`;
              return (
                <div
                  key={r.key}
                  className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-700 flex-shrink-0">
                      <FiFileText size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base">{r.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onDownload(r, 'xlsx')}
                      disabled={disabled || busyXlsx}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
                    >
                      {busyXlsx ? <FiLoader className="animate-spin" /> : <FiGrid />}
                      <span>Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload(r, 'pdf')}
                      disabled={disabled || busyPdf}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
                    >
                      {busyPdf ? <FiLoader className="animate-spin" /> : <FiDownload />}
                      <span>PDF</span>
                    </button>
                  </div>
                  {!r.requiresSession && (
                    <p className="text-xs text-gray-500 italic">Ignores session picker — covers all data.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
