'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiDownload, FiUpload, FiUsers } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Session = { id: string; name: string };
type Section = { id: string; name: string; description: string; studentCount: number };
type Totals = { students: number; assigned: number; unassigned: number };
type Student = {
  studentSessionId: string;
  userId: string;
  name: string;
  email: string;
  registrationNumber: string;
  enrollmentStatus: string;
  sectionId: string | null;
  sectionName: string;
};

function Content() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<string>('ALL'); // ALL | UNASSIGNED | <sectionId>
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/sessions', { params: { page: 1, limit: 100 } });
        const list: Session[] = res.data.sessions || [];
        setSessions(list);
        if (list.length > 0) setSessionId((prev) => prev || list[0].id);
      } catch {
        toast.error('Failed to load sessions');
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const [secRes, stuRes] = await Promise.all([
        apiClient.get('/sections', { params: { sessionId } }),
        apiClient.get('/sections/students', { params: { sessionId } }),
      ]);
      setSections(secRes.data.sections || []);
      setTotals(secRes.data.totals || null);
      setStudents(stuRes.data.students || []);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (filter === 'UNASSIGNED' && s.sectionId) return false;
      if (filter !== 'ALL' && filter !== 'UNASSIGNED' && s.sectionId !== filter) return false;
      if (!q) return true;
      return [s.name, s.email, s.registrationNumber, s.sectionName].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [students, filter, query]);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((prev) =>
    prev.size === visible.length ? new Set() : new Set(visible.map((s) => s.studentSessionId)));

  const createSection = async () => {
    const name = prompt('Section name (e.g. SEC-A)');
    if (name === null) return;
    if (!name.trim()) { toast.error('Name is required'); return; }
    try {
      await apiClient.post('/sections', { academicSessionId: sessionId, name: name.trim() });
      toast.success('Section created');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create section');
    }
  };

  const renameSection = async (s: Section) => {
    const name = prompt('New name', s.name);
    if (name === null || name.trim() === s.name) return;
    try {
      await apiClient.patch(`/sections/${s.id}`, { name: name.trim() });
      toast.success('Section renamed');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to rename section');
    }
  };

  const deleteSection = async (s: Section) => {
    if (!confirm(`Delete "${s.name}"? Its ${s.studentCount} student(s) become unassigned — no student data is removed.`)) return;
    try {
      const res = await apiClient.delete(`/sections/${s.id}`);
      toast.success(res.data.message || 'Section deleted');
      if (filter === s.id) setFilter('ALL');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete section');
    }
  };

  const applyMove = async (targetSectionId: string | null) => {
    if (selected.size === 0) { toast.error('Select students first'); return; }
    try {
      setBusy(true);
      const res = await apiClient.post('/sections/assign', {
        studentSessionIds: [...selected],
        sectionId: targetSectionId,
      });
      toast.success(res.data.message || 'Updated');
      setMoveTo('');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update students');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await apiClient.get('/sections/template', { params: { sessionId }, responseType: 'blob' });
      const name = sessions.find((s) => s.id === sessionId)?.name || 'session';
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sections-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setBusy(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post('/sections/import', fd, { params: { sessionId } });
      const d = res.data;
      const extras = [
        d.sectionsCreated ? `${d.sectionsCreated} new section(s)` : '',
        d.skippedNoSection ? `${d.skippedNoSection} row(s) with no section` : '',
        d.notInSession ? `${d.notInSession} not in this session` : '',
      ].filter(Boolean).join(', ');
      toast.success(`${d.message}${extras ? ` — ${extras}` : ''}`, { duration: 7000 });
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to import sections', { duration: 7000 });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Group students of a session into sections. This is only a label — it changes nothing else in the portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={sessionId} onChange={(e) => { setSessionId(e.target.value); setFilter('ALL'); }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
            {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          <button type="button" onClick={downloadTemplate} disabled={!sessionId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            <FiDownload className="h-4 w-4" /> Template
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || !sessionId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            <FiUpload className="h-4 w-4" /> Import Excel
          </button>
          <button type="button" onClick={createSection} disabled={!sessionId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            <FiPlus className="h-4 w-4" /> New Section
          </button>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Students', value: totals.students },
            { label: 'In a section', value: totals.assigned },
            { label: 'Unassigned', value: totals.unassigned },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-bold text-gray-900">Sections in this session</div>
        {sections.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No sections yet — create one, or import your Excel.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
                <button type="button" onClick={() => setFilter(s.id)}
                  className={`font-semibold ${filter === s.id ? 'text-blue-700' : 'text-gray-800 hover:text-blue-700'}`}>
                  {s.name}
                </button>
                <span className="text-xs text-gray-500">{s.studentCount}</span>
                <button type="button" onClick={() => renameSection(s)} title="Rename" className="text-blue-600 hover:text-blue-800"><FiEdit2 className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => deleteSection(s)} title="Delete" className="text-red-600 hover:text-red-800"><FiTrash2 className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
          <FiUsers className="h-4 w-4 text-gray-500" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900">
            <option value="ALL">All students</option>
            <option value="UNASSIGNED">Unassigned</option>
            {sections.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, email…"
              className="w-60 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900" />
          </div>
          <span className="text-xs text-gray-500">{visible.length} shown · {selected.size} selected</span>

          <div className="ml-auto flex items-center gap-2">
            <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900">
              <option value="">Move selected to…</option>
              {sections.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <button type="button" onClick={() => applyMove(moveTo)} disabled={busy || !moveTo || selected.size === 0}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              Move
            </button>
            <button type="button" onClick={() => applyMove(null)} disabled={busy || selected.size === 0}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Unassign
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500 italic">No students match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" checked={selected.size > 0 && selected.size === visible.length}
                      onChange={toggleAll} className="h-4 w-4 accent-blue-600" aria-label="Select all shown" />
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Student ID</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((s) => (
                  <tr key={s.studentSessionId} className={selected.has(s.studentSessionId) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(s.studentSessionId)}
                        onChange={() => toggle(s.studentSessionId)} className="h-4 w-4 accent-blue-600"
                        aria-label={`Select ${s.name}`} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-[11px] text-gray-500">{s.email}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{s.registrationNumber || '—'}</td>
                    <td className="px-4 py-2">
                      {s.sectionName
                        ? <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{s.sectionName}</span>
                        : <span className="text-xs text-gray-400">unassigned</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Import accepts your existing sheet: a <span className="font-semibold">StudentID</span> (or Email) column and a{' '}
        <span className="font-semibold">Section</span> column. Missing sections are created automatically; rows without a
        section, or students not enrolled in this session, are skipped and reported.
      </p>
    </div>
  );
}

export default function SectionsPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
