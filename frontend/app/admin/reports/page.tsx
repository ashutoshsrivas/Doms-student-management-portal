'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FiDownload, FiFileText, FiGrid, FiLoader, FiAlertCircle, FiSearch, FiBriefcase, FiUsers, FiCheckCircle, FiUserCheck } from 'react-icons/fi';
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
  category?: string;
}

// Static per-category icon + colour palette so the grid reads as a
// grouped catalog rather than an undifferentiated pile of cards.
const CATEGORY_META: Record<string, { icon: React.ReactNode; tone: string; wash: string }> = {
  Students:              { icon: <FiUsers className="w-5 h-5" />, tone: 'text-blue-700', wash: 'bg-blue-50' },
  'Internships (SIP)':   { icon: <FiBriefcase className="w-5 h-5" />, tone: 'text-emerald-700', wash: 'bg-emerald-50' },
  Assessments:           { icon: <FiCheckCircle className="w-5 h-5" />, tone: 'text-purple-700', wash: 'bg-purple-50' },
  Mentors:               { icon: <FiUserCheck className="w-5 h-5" />, tone: 'text-amber-700', wash: 'bg-amber-50' },
  Users:                 { icon: <FiUsers className="w-5 h-5" />, tone: 'text-gray-700', wash: 'bg-gray-100' },
  Other:                 { icon: <FiFileText className="w-5 h-5" />, tone: 'text-gray-700', wash: 'bg-gray-100' },
};
const catOf = (r: ReportType) => r.category || 'Other';
const CATEGORY_ORDER = ['Students', 'Internships (SIP)', 'Assessments', 'Mentors', 'Users', 'Other'];

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
    // Reports is accessible to admin/HOD and PLACEMENT_COORDINATOR.
    if (!['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    loadCatalog();
  }, [user, router, loadCatalog]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => set.add(catOf(r)));
    const ordered = CATEGORY_ORDER.filter((c) => set.has(c));
    // Any unknown categories tail the list
    Array.from(set).forEach((c) => { if (!ordered.includes(c)) ordered.push(c); });
    return ['All', ...ordered];
  }, [reports]);

  const visibleReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (activeCategory !== 'All' && catOf(r) !== activeCategory) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        catOf(r).toLowerCase().includes(q)
      );
    });
  }, [reports, search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportType[]>();
    for (const r of visibleReports) {
      const c = catOf(r);
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(r);
    }
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => ({ category: c, reports: map.get(c)! }))
      .concat(
        Array.from(map.keys())
          .filter((c) => !CATEGORY_ORDER.includes(c))
          .map((c) => ({ category: c, reports: map.get(c)! })),
      );
  }, [visibleReports]);

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
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FiFileText className="w-6 h-6 text-blue-600" /> Reports
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Export any slice of the portal as Excel or PDF. Session-scoped reports use the picker below; the &quot;All Users&quot; report ignores it.
              </p>
            </div>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1">
              {reports.length} reports available
            </span>
          </div>

          {/* Controls: session + search side-by-side */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Session</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sessions.length === 0 ? (
                    <option value="">No sessions found</option>
                  ) : (
                    sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.isActive ? '  (active)' : ''}
                      </option>
                    ))
                  )}
                </select>
                {activeSession && (activeSession.startDate || activeSession.endDate) && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {activeSession.startDate ? new Date(activeSession.startDate).toLocaleDateString() : '—'}
                    {' → '}
                    {activeSession.endDate ? new Date(activeSession.endDate).toLocaleDateString() : '—'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Search reports</label>
                <div className="relative mt-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, description or category"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                    activeCategory === c
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Empty session state */}
          {sessions.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
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

          {/* Grouped grid */}
          {visibleReports.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-xl bg-white">
              <p className="text-gray-800 font-medium">No reports match your filter.</p>
            </div>
          ) : (
            grouped.map(({ category, reports: catReports }) => {
              const meta = CATEGORY_META[category] || CATEGORY_META.Other;
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${meta.wash} ${meta.tone}`}>
                      {meta.icon}
                    </span>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">{category}</h2>
                    <span className="text-xs text-gray-500">({catReports.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {catReports.map((r) => {
                      const disabled = r.requiresSession && !selectedSessionId;
                      const busyXlsx = busyKey === `${r.key}:xlsx`;
                      const busyPdf = busyKey === `${r.key}:pdf`;
                      return (
                        <div
                          key={r.key}
                          className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:border-blue-300 hover:shadow-sm transition"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`p-2 rounded-lg ${meta.wash} ${meta.tone} flex-shrink-0`}>
                              {meta.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <h3 className="font-semibold text-gray-900 text-sm">{r.title}</h3>
                                {!r.requiresSession && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
                                    All data
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{r.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onDownload(r, 'xlsx')}
                              disabled={disabled || busyXlsx}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition"
                            >
                              {busyXlsx ? <FiLoader className="animate-spin" /> : <FiGrid size={14} />}
                              Excel
                            </button>
                            <button
                              type="button"
                              onClick={() => onDownload(r, 'pdf')}
                              disabled={disabled || busyPdf}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition"
                            >
                              {busyPdf ? <FiLoader className="animate-spin" /> : <FiDownload size={14} />}
                              PDF
                            </button>
                          </div>
                          {disabled && (
                            <p className="text-[11px] text-gray-500 italic">Pick a session above to enable download.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
