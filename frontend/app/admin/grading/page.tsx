'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiUsers, FiCalendar, FiTrash2, FiEdit2 } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useAuthStore from '@/app/store/authStore';

type Sheet = {
  id: string;
  title: string;
  description: string;
  academicSessionId: string;
  sessionName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  gradeCount: number;
};
type Session = { id: string; name: string };

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

function Content() {
  const { user } = useAuthStore();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Sheet | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/grades/sheets');
      setSheets(res.data.sheets || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load grading lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await apiClient.get('/sessions', { params: { page: 1, limit: 100 } });
        setSessions(res.data.sessions || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const remove = async (s: Sheet) => {
    if (!confirm(`Delete "${s.title}" and its ${s.gradeCount} grade(s)? This cannot be undone.`)) return;
    try {
      const res = await apiClient.delete(`/grades/sheets/${s.id}`);
      toast.success(res.data.message || 'Deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = sheets.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [s.title, s.sessionName, s.createdByName].some((v) => (v || '').toLowerCase().includes(q));
  });

  const canEdit = (s: Sheet) => s.createdBy === user?.id || ['ADMIN', 'HOD'].includes(user?.role || '');

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grading</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a grading list for a session, then grade students O, A+, A, B+, B, C, P, F or AB.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, session…"
              className="w-60 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900" />
          </div>
          <button type="button" onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <FiPlus className="h-4 w-4" /> New List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          {sheets.length === 0 ? 'No grading lists yet. Create your first with the "New List" button.' : 'No lists match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/grading/${s.id}`} className="text-base font-bold text-gray-900 hover:text-blue-700">
                    {s.title}
                  </Link>
                  {s.description && <p className="mt-0.5 text-sm text-gray-600">{s.description}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><FiCalendar className="h-3 w-3" /> {s.sessionName || '—'}</span>
                    <span className="inline-flex items-center gap-1"><FiUsers className="h-3 w-3" /> {s.gradeCount} graded</span>
                    <span>by {s.createdByName || '—'} · {fmt(s.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/grading/${s.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    Open
                  </Link>
                  {canEdit(s) && (
                    <>
                      <button type="button" onClick={() => setEditing(s)} title="Rename"
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><FiEdit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => remove(s)} title="Delete"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SheetModal
          sheet={editing}
          sessions={sessions}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

function SheetModal({ sheet, sessions, onClose, onSaved }: {
  sheet: Sheet | null;
  sessions: Session[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(sheet?.title || '');
  const [description, setDescription] = useState(sheet?.description || '');
  const [sessionId, setSessionId] = useState(sheet?.academicSessionId || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!sessionId) { toast.error('Pick a session'); return; }
    try {
      setSaving(true);
      const body = { title: title.trim(), description: description.trim() || null, academicSessionId: sessionId };
      if (sheet) await apiClient.patch(`/grades/sheets/${sheet.id}`, body);
      else await apiClient.post('/grades/sheets', body);
      toast.success(sheet ? 'Grading list updated' : 'Grading list created');
      await onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">{sheet ? 'Edit grading list' : 'New grading list'}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Presentation Skills — Round 1"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Session *</label>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900">
              <option value="">Select session</option>
              {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving…' : sheet ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GradingPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR', 'TRAINER', 'MENTOR']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
