'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText, FiSearch, FiExternalLink, FiDownload } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type NocRow = {
  sipId: string;
  studentName: string;
  enrollmentNo: string;
  email: string;
  specialization: string;
  companyName: string;
  sessionName: string;
  nocUrl: string;
  nocFileName: string;
  nocUploadedAt: string | null;
};
type Session = { id: string; name: string };

const fmt = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

function Content() {
  const [rows, setRows] = useState<NocRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/sessions', { params: { page: 1, limit: 100 } });
        setSessions(res.data.sessions || []);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/sip/noc-list', { params: sessionId ? { sessionId } : {} });
        setRows(res.data.students || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load NOC list');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.studentName, r.enrollmentNo, r.email, r.companyName, r.specialization]
        .some((v) => (v || '').toLowerCase().includes(q)));
  }, [rows, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NOC Uploads</h1>
          <p className="mt-1 text-sm text-gray-500">Students who have uploaded their No-Objection Certificate.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
            <option value="">All sessions</option>
            {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, enrolment, company…"
              className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <FiFileText className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-gray-900">Uploaded NOCs</span>
          <span className="ml-auto text-xs text-gray-500">{filtered.length} student{filtered.length === 1 ? '' : 's'}</span>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500 italic">No NOCs uploaded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Enrolment</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Company</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Session</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Uploaded</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">NOC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.sipId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{r.studentName || '—'}</div>
                      <div className="text-[11px] text-gray-500">{r.email}{r.specialization ? ` · ${r.specialization}` : ''}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.enrollmentNo || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{r.companyName || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{r.sessionName || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{fmt(r.nocUploadedAt)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <a href={r.nocUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">
                          <FiExternalLink className="h-3.5 w-3.5" /> View
                        </a>
                        <a href={r.nocUrl} download
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900">
                          <FiDownload className="h-3.5 w-3.5" /> Download
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SipNocPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR', 'TRAINER', 'MENTOR']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
