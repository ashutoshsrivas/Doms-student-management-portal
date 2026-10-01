'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiDownload, FiUpload, FiSearch, FiTrash2, FiSave } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Sheet = { id: string; title: string; description: string; sessionName: string; createdByName: string; gradeCount: number };
type Student = { studentSessionId: string; id: string; name: string; email: string; registrationNumber: string; section: string; grade: string | null };
type GradeRow = {
  id: string;
  studentSessionId: string;
  grade: string;
  gradedByName: string;
  gradedAt: string | null;
  student: { id: string; name: string; email: string; registrationNumber: string } | null;
};

const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'AB'];
const label = (g: string) => (g === 'AB' ? 'AB (absent)' : g);
const chipClass = (g: string) => ({
  'O': 'bg-emerald-100 text-emerald-800',
  'A+': 'bg-emerald-50 text-emerald-700',
  'A': 'bg-green-50 text-green-700',
  'B+': 'bg-blue-50 text-blue-700',
  'B': 'bg-sky-50 text-sky-700',
  'C': 'bg-amber-50 text-amber-700',
  'P': 'bg-orange-50 text-orange-700',
  'F': 'bg-red-50 text-red-700',
  'AB': 'bg-gray-100 text-gray-600',
}[g] || 'bg-gray-100 text-gray-600');

function Content() {
  const params = useParams();
  const router = useRouter();
  const sheetId = params.id as string;

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL'); // ALL | NONE | <section name>
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [sheetRes, studentsRes] = await Promise.all([
        apiClient.get(`/grades/sheets/${sheetId}`),
        apiClient.get(`/grades/sheets/${sheetId}/students`),
      ]);
      setSheet(sheetRes.data.sheet);
      setGrades(sheetRes.data.grades || []);
      setCanEdit(!!sheetRes.data.canEdit);
      setStudents(studentsRes.data.students || []);
      setDraft({});
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load grading list');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sheetId]);

  const gradedCount = grades.length;
  const pendingChanges = Object.keys(draft).length;

  // Sections present on this session's students, for the filter.
  const sectionOptions = useMemo(
    () => [...new Set(students.map((s) => s.section).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [students],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (sectionFilter === 'NONE' && s.section) return false;
      if (sectionFilter !== 'ALL' && sectionFilter !== 'NONE' && s.section !== sectionFilter) return false;
      if (!q) return true;
      return [s.name, s.email, s.registrationNumber, s.section].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [students, query, sectionFilter]);

  const setGrade = (studentSessionId: string, grade: string) => {
    setDraft((d) => ({ ...d, [studentSessionId]: grade }));
  };

  const saveAll = async () => {
    const payload = Object.entries(draft)
      .filter(([, g]) => g)
      .map(([studentSessionId, grade]) => ({ studentSessionId, grade }));
    if (payload.length === 0) { toast.error('Nothing to save'); return; }
    try {
      setSaving(true);
      const res = await apiClient.post(`/grades/sheets/${sheetId}/grades`, { grades: payload });
      toast.success(res.data.message || 'Grades saved');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const removeGrade = async (row: GradeRow) => {
    if (!confirm(`Remove the grade for ${row.student?.name || 'this student'}?`)) return;
    try {
      await apiClient.delete(`/grades/${row.id}`);
      toast.success('Grade removed');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to remove grade');
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await apiClient.get(`/grades/sheets/${sheetId}/template`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(sheet?.title || 'grades').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-grades-template.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error('Failed to download template');
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post(`/grades/sheets/${sheetId}/upload`, fd);
      const d = res.data;
      const extras = [
        d.skippedNoGrade ? `${d.skippedNoGrade} without a grade` : '',
        d.skippedBadGrade ? `${d.skippedBadGrade} with an unrecognised grade` : '',
        d.skippedUnmatched ? `${d.skippedUnmatched} not in this session` : '',
      ].filter(Boolean).join(', ');
      toast.success(`${d.message}${extras ? ` — skipped: ${extras}` : ''}`, { duration: 6000 });
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to upload grades');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl p-6 text-center text-sm text-gray-500">Loading…</div>;
  }
  if (!sheet) {
    return <div className="mx-auto max-w-5xl p-6 text-center text-sm text-gray-500">Grading list not found.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => router.push('/admin/grading')} className="mt-1 rounded p-1 text-gray-500 hover:bg-gray-100">
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sheet.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {sheet.sessionName} · {gradedCount} graded · created by {sheet.createdByName || '—'}
            </p>
            {sheet.description && <p className="mt-1 text-sm text-gray-600">{sheet.description}</p>}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <FiDownload className="h-4 w-4" /> Download template
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              <FiUpload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload filled sheet'}
            </button>
            <button type="button" onClick={saveAll} disabled={saving || pendingChanges === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <FiSave className="h-4 w-4" /> {saving ? 'Saving…' : `Save${pendingChanges ? ` (${pendingChanges})` : ''}`}
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Read-only — only {sheet.createdByName || 'the creator'}, ADMIN or HOD can change these grades.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
          <span className="text-sm font-bold text-gray-900">Students in {sheet.sessionName}</span>
          <span className="text-xs text-gray-500">
            {filtered.length === students.length ? `${students.length} total` : `${filtered.length} of ${students.length}`}
          </span>
          {sectionOptions.length > 0 && (
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              aria-label="Filter by section"
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
            >
              <option value="ALL">All sections</option>
              {sectionOptions.map((name) => (<option key={name} value={name}>{name}</option>))}
              <option value="NONE">No section</option>
            </select>
          )}
          <div className="relative ml-auto">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, enrolment, email…"
              className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500 italic">No students match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Enrolment</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Section</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Grade</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Graded by</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const row = grades.find((g) => g.studentSessionId === s.studentSessionId);
                  const value = draft[s.studentSessionId] ?? s.grade ?? '';
                  const changed = draft[s.studentSessionId] !== undefined && draft[s.studentSessionId] !== (s.grade || '');
                  return (
                    <tr key={s.studentSessionId} className={changed ? 'bg-blue-50/50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-[11px] text-gray-500">{s.email}</div>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{s.registrationNumber || '—'}</td>
                      <td className="px-4 py-2">
                        {s.section
                          ? <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{s.section}</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        {canEdit ? (
                          <select value={value} onChange={(e) => setGrade(s.studentSessionId, e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900">
                            <option value="">— not graded —</option>
                            {GRADES.map((g) => (<option key={g} value={g}>{label(g)}</option>))}
                          </select>
                        ) : value ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${chipClass(value)}`}>{label(value)}</span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">{row?.gradedByName || '—'}</td>
                      <td className="px-4 py-2 text-right">
                        {canEdit && row && (
                          <button type="button" onClick={() => removeGrade(row)} title="Remove grade"
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canEdit && (
        <p className="text-xs text-gray-500">
          Tip: download the template, fill the <span className="font-semibold">Grade</span> column with O, A+, A, B+, B, C, P, F or AB,
          and upload it back. Rows without a grade are left untouched; the Section column is there to sort by and is ignored on upload.
        </p>
      )}
    </div>
  );
}

export default function GradingDetailPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR', 'TRAINER', 'MENTOR']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
