'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiPlus, FiBookOpen, FiUsers, FiTrash2, FiEdit2, FiSearch } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import ExamShell from './ExamShell';

type Course = {
  id: string;
  title: string;
  code: string;
  trimester: string;
  academicSessionId: string;
  sessionName: string;
  createdByName: string;
  questionCount: number;
  assignees: { id: string; name: string; email: string }[];
};
type Session = { id: string; name: string };

function Content() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/exams/courses');
      setCourses(data.courses || []);
      setIsAdmin(!!data.isAdmin);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const { data } = await apiClient.get('/sessions', { params: { page: 1, limit: 100 } });
        setSessions(data.sessions || []);
      } catch { /* ignore */ }
    })();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.code?.trim()) { toast.error('Title and code are required'); return; }
    if (!editing.id && !editing.academicSessionId) { toast.error('Pick a session'); return; }
    try {
      setSaving(true);
      const body = {
        title: editing.title.trim(),
        code: editing.code.trim(),
        trimester: editing.trimester || null,
        academicSessionId: editing.academicSessionId,
      };
      if (editing.id) await apiClient.patch(`/exams/courses/${editing.id}`, body);
      else await apiClient.post('/exams/courses', body);
      toast.success(editing.id ? 'Course updated' : 'Course created');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Course) => {
    if (!confirm(`Delete "${c.title}"? Its ${c.questionCount} question(s) and COs go too.`)) return;
    try {
      const { data } = await apiClient.delete(`/exams/courses/${c.id}`);
      toast.success(data.message || 'Deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const visible = courses.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.title, c.code, c.sessionName, c.trimester].some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'Create courses, assign them to staff, and generate question papers from the bank.'
              : 'Courses assigned to you. Add course outcomes and questions to the bank.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search course, code…"
              className="w-56 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900" />
          </div>
          {isAdmin && (
            <button type="button" onClick={() => setEditing({ title: '', code: '', trimester: '', academicSessionId: sessions[0]?.id })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <FiPlus className="h-4 w-4" /> New Course
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          {courses.length === 0
            ? (isAdmin ? 'No courses yet. Create one with the "New Course" button.' : 'No courses are assigned to you yet.')
            : 'No courses match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/exams/${c.id}`} className="inline-flex items-center gap-2 text-base font-bold text-gray-900 hover:text-blue-700">
                    <FiBookOpen className="h-4 w-4 text-blue-600" /> {c.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">{c.code}</span>
                    {c.trimester && <span>{c.trimester}</span>}
                    <span>{c.sessionName}</span>
                    <span>{c.questionCount} question{c.questionCount === 1 ? '' : 's'}</span>
                    {c.assignees.length > 0 && (
                      <span className="inline-flex items-center gap-1"><FiUsers className="h-3 w-3" /> {c.assignees.map((a) => a.name).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/exams/${c.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Open</Link>
                  {isAdmin && (
                    <>
                      <button type="button" onClick={() => setEditing({ ...c })} title="Edit"
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><FiEdit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => remove(c)} title="Delete"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">{editing.id ? 'Edit course' : 'New course'}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Course title *</label>
                <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Managerial Economics" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Course code *</label>
                  <input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                    placeholder="e.g. MBA 103" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Trimester</label>
                  <input value={editing.trimester || ''} onChange={(e) => setEditing({ ...editing, trimester: e.target.value })}
                    placeholder="e.g. I Trimester" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                </div>
              </div>
              {!editing.id && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Session *</label>
                  <select value={editing.academicSessionId || ''} onChange={(e) => setEditing({ ...editing, academicSessionId: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900">
                    <option value="">Select session</option>
                    {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : editing.id ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamsPage() {
  return (
    <ExamShell>
      <Content />
    </ExamShell>
  );
}
