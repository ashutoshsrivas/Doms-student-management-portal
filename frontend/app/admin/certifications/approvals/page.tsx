'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiCheck, FiClock, FiSearch, FiX, FiAward, FiUser,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Request = {
  id: string;
  status: string;
  batchId: string | null;
  certificationId: string;
  certificationTitle: string;
  certificateNumber: string;
  studentName: string;
  studentEmail: string;
  registrationNumber: string;
  requestedByName: string;
  requestedByRole: string;
  requestedAt: string;
  approvedByName: string;
  approvedAt: string | null;
  decisionNote: string;
};

const STAFF_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];

const STATUS_STYLE: Record<string, string> = {
  ISSUED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-800',
  REJECTED: 'bg-red-50 text-red-700',
  REVOKED: 'bg-gray-100 text-gray-600',
};
const STATUS_LABEL: Record<string, string> = {
  ISSUED: 'Approved — visible to student',
  PENDING: 'Awaiting approval',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
};

const fmt = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

function Content() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Record<string, true>>({});
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/certifications/requests', {
        params: showAll ? { status: 'ALL' } : {},
      });
      setRequests(data.requests || []);
      setCanApprove(!!data.canApprove);
      setPicked({});
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load certificate requests');
    } finally {
      setLoading(false);
    }
  }, [showAll]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => [r.certificationTitle, r.studentName, r.registrationNumber, r.studentEmail, r.requestedByName]
      .some((v) => (v || '').toLowerCase().includes(q)));
  }, [requests, query]);

  // Grouped by certificate + whoever granted it: that is the unit people
  // actually approve.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; title: string; certificationId: string; by: string; role: string; at: string; rows: Request[] }>();
    visible.forEach((r) => {
      const key = `${r.certificationId}|${r.requestedByName}|${r.batchId || 'none'}`;
      const g = map.get(key) || {
        key,
        title: r.certificationTitle,
        certificationId: r.certificationId,
        by: r.requestedByName,
        role: r.requestedByRole,
        at: r.requestedAt,
        rows: [],
      };
      g.rows.push(r);
      map.set(key, g);
    });
    return Array.from(map.values()).sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [visible]);

  const pickedIds = Object.keys(picked);
  const pendingVisible = visible.filter((r) => r.status === 'PENDING');

  const toggle = (id: string) => setPicked((prev) => {
    const next = { ...prev };
    if (next[id]) delete next[id]; else next[id] = true;
    return next;
  });
  const toggleGroup = (rows: Request[]) => {
    const ids = rows.filter((r) => r.status === 'PENDING').map((r) => r.id);
    const allPicked = ids.every((id) => picked[id]);
    setPicked((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { if (allPicked) delete next[id]; else next[id] = true; });
      return next;
    });
  };

  const decide = async (ids: string[], decision: 'APPROVE' | 'REJECT', reason?: string) => {
    if (ids.length === 0) { toast.error('Pick at least one certificate'); return; }
    try {
      setBusy(true);
      const { data } = await apiClient.post('/certifications/requests/decide', {
        decision, assignmentIds: ids, note: reason || null,
      });
      toast.success(data.message || 'Done');
      setRejecting(null);
      setNote('');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record the decision');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/certifications" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><FiArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{canApprove ? 'Certificate approvals' : 'My certificate requests'}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {canApprove
              ? 'Certificates granted by faculty. A student sees nothing until you approve.'
              : 'What you granted and where it stands. Students see a certificate only once it is approved.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, certificate, faculty…"
            className="w-72 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900" />
        </div>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-gray-600">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Include decided ones
        </label>
        {canApprove && pickedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">{pickedIds.length} selected</span>
            <button type="button" disabled={busy} onClick={() => decide(pickedIds, 'APPROVE')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              <FiCheck className="h-4 w-4" /> Approve
            </button>
            <button type="button" disabled={busy} onClick={() => setRejecting(pickedIds)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
              <FiX className="h-4 w-4" /> Reject
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          {canApprove
            ? (showAll ? 'No certificate requests yet.' : 'Nothing waiting for approval.')
            : (showAll ? 'You have not granted any certificates yet.' : 'You have nothing waiting for approval.')}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const pending = g.rows.filter((r) => r.status === 'PENDING');
            const ids = pending.map((r) => r.id);
            const allPicked = ids.length > 0 && ids.every((id) => picked[id]);
            return (
              <div key={g.key} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-4">
                  <div className="min-w-0">
                    <Link href={`/admin/certifications/${g.certificationId}`} className="inline-flex items-center gap-2 text-base font-bold text-gray-900 hover:text-blue-700">
                      <FiAward className="h-4 w-4 text-amber-500" /> {g.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><FiUser className="h-3 w-3" /> {g.by}{g.role ? ` · ${g.role}` : ''}</span>
                      <span className="inline-flex items-center gap-1"><FiClock className="h-3 w-3" /> {fmt(g.at)}</span>
                      <span>{g.rows.length} student{g.rows.length === 1 ? '' : 's'}</span>
                      {pending.length > 0 && <span className="font-semibold text-amber-700">{pending.length} awaiting approval</span>}
                    </div>
                  </div>
                  {canApprove && pending.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleGroup(g.rows)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        {allPicked ? 'Clear' : 'Select all'}
                      </button>
                      <button type="button" disabled={busy} onClick={() => decide(ids, 'APPROVE')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                        <FiCheck className="h-3.5 w-3.5" /> Approve all
                      </button>
                      <button type="button" disabled={busy} onClick={() => setRejecting(ids)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                        <FiX className="h-3.5 w-3.5" /> Reject all
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[640px] w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {canApprove && <th className="w-8 px-3 py-2"></th>}
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Student</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Student ID</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Decided</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {g.rows.map((r) => (
                        <tr key={r.id} className={picked[r.id] ? 'bg-blue-50/50' : ''}>
                          {canApprove && (
                            <td className="px-3 py-2">
                              {r.status === 'PENDING' && (
                                <input type="checkbox" checked={!!picked[r.id]} onChange={() => toggle(r.id)} />
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{r.studentName}</div>
                            <div className="text-[11px] text-gray-500">{r.studentEmail}</div>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">{r.registrationNumber || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABEL[r.status] || r.status}
                            </span>
                            {r.decisionNote && <div className="mt-0.5 text-[11px] text-gray-500">{r.decisionNote}</div>}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {r.approvedAt ? `${fmt(r.approvedAt)}${r.approvedByName ? ` · ${r.approvedByName}` : ''}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canApprove && pendingVisible.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          {pendingVisible.length} certificate{pendingVisible.length === 1 ? '' : 's'} still waiting.
        </p>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">
                Reject {rejecting.length} certificate{rejecting.length === 1 ? '' : 's'}
              </h3>
              <button type="button" onClick={() => { setRejecting(null); setNote(''); }} className="text-gray-400 hover:text-gray-600"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-sm text-gray-600">The students never see these. The faculty member who granted them sees your reason.</p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason (optional)</label>
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000}
                  placeholder="e.g. Attendance below the required 75%"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button type="button" onClick={() => { setRejecting(null); setNote(''); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={busy} onClick={() => decide(rejecting, 'REJECT', note.trim() || undefined)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {busy ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertificateApprovalsPage() {
  return (
    <ProtectedRoute requiredRoles={STAFF_ROLES}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
