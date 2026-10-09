'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiPlus, FiTrash2, FiEdit2, FiSearch, FiDownload,
  FiRefreshCw, FiUsers, FiTarget, FiHelpCircle, FiX,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import ExamShell from '../ExamShell';

type Course = { id: string; title: string; code: string; trimester: string; sessionName: string; questionCount: number };
type Outcome = { id: string; code: string; description: string };
type Question = {
  id: string; text: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: 'TEN_MARK' | 'TWENTY_MARK' | 'CASE_STUDY';
  courseOutcomeId: string | null; outcomeCode: string; authorName: string;
};
type Person = { id: string; name: string; email: string; role: string };

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const TYPES = [
  { value: 'TEN_MARK', label: '10 marks question' },
  { value: 'TWENTY_MARK', label: '20 marks question' },
  { value: 'CASE_STUDY', label: 'Case study' },
] as const;
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label || t;
const diffClass = (d: string) => ({
  EASY: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HARD: 'bg-red-50 text-red-700',
}[d] || 'bg-gray-100 text-gray-600');

function Content() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignees, setAssignees] = useState<Person[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'questions' | 'cos' | 'people' | 'paper'>('questions');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/exams/courses/${courseId}`);
      setCourse(data.course);
      setOutcomes(data.outcomes || []);
      setQuestions(data.questions || []);
      setAssignees(data.assignees || []);
      setIsAdmin(!!data.isAdmin);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load the course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="mx-auto max-w-5xl p-6 text-center text-sm text-slate-500">Loading…</div>;
  if (!course) return <div className="mx-auto max-w-5xl p-6 text-center text-sm text-slate-500">Course not found.</div>;

  const tabs: [typeof tab, string][] = [
    ['questions', `Question bank (${questions.length})`],
    ['cos', `Course outcomes (${outcomes.length})`],
    ...(isAdmin ? ([['people', `People (${assignees.length})`], ['paper', 'Question paper']] as [typeof tab, string][]) : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => router.push('/exams')} className="mt-1 rounded p-1 text-slate-500 hover:bg-slate-200">
          <FiArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">{course.code}</span>
            {course.trimester && <span>{course.trimester}</span>}
            <span>{course.sessionName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'questions' && <QuestionBank courseId={courseId} questions={questions} outcomes={outcomes} reload={load} />}
      {tab === 'cos' && <Outcomes courseId={courseId} outcomes={outcomes} reload={load} />}
      {tab === 'people' && isAdmin && <People courseId={courseId} assignees={assignees} reload={load} />}
      {tab === 'paper' && isAdmin && <PaperBuilder courseId={courseId} course={course} />}
    </div>
  );
}

function QuestionBank({ courseId, questions, outcomes, reload }: {
  courseId: string; questions: Question[]; outcomes: Outcome[]; reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Partial<Question> | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [fDiff, setFDiff] = useState('ALL');
  const [fType, setFType] = useState('ALL');

  const visible = useMemo(() => questions.filter((q) => {
    if (fDiff !== 'ALL' && q.difficulty !== fDiff) return false;
    if (fType !== 'ALL' && q.type !== fType) return false;
    const s = query.trim().toLowerCase();
    if (!s) return true;
    return [q.text, q.outcomeCode, q.authorName].some((v) => (v || '').toLowerCase().includes(s));
  }), [questions, fDiff, fType, query]);

  const save = async () => {
    if (!editing?.text?.trim()) { toast.error('Question text is required'); return; }
    if (!editing.difficulty || !editing.type) { toast.error('Pick a difficulty and a question type'); return; }
    try {
      setSaving(true);
      const body = {
        text: editing.text.trim(),
        difficulty: editing.difficulty,
        type: editing.type,
        courseOutcomeId: editing.courseOutcomeId || null,
      };
      if (editing.id) await apiClient.patch(`/exams/questions/${editing.id}`, body);
      else await apiClient.post(`/exams/courses/${courseId}/questions`, body);
      toast.success(editing.id ? 'Question updated' : 'Question added');
      setEditing(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (q: Question) => {
    if (!confirm('Remove this question from the bank?')) return;
    try {
      await apiClient.delete(`/exams/questions/${q.id}`);
      toast.success('Removed');
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const counts = TYPES.map((t) => ({ ...t, n: questions.filter((q) => q.type === t.value).length }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select value={fDiff} onChange={(e) => setFDiff(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900">
          <option value="ALL">All difficulties</option>
          {DIFFICULTIES.map((d) => (<option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>))}
        </select>
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900">
          <option value="ALL">All types</option>
          {TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
        </select>
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search question, CO…"
            className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm text-slate-900" />
        </div>
        <span className="text-xs text-slate-500">{counts.map((c) => `${c.n} ${c.label}`).join(' · ')}</span>
        <button type="button" onClick={() => setEditing({ text: '', difficulty: 'MEDIUM', type: 'TEN_MARK' })}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <FiPlus className="h-4 w-4" /> Add question
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          {questions.length === 0 ? 'The bank is empty. Add your first question.' : 'No questions match the filters.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((q) => (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="whitespace-pre-line text-sm text-slate-900">{q.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${diffClass(q.difficulty)}`}>{q.difficulty}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{typeLabel(q.type)}</span>
                    {q.outcomeCode && <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">{q.outcomeCode}</span>}
                    <span className="text-slate-400">by {q.authorName || '—'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setEditing({ ...q })} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><FiEdit2 className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(q)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing.id ? 'Edit question' : 'Add question'}</h2>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Question *</label>
                <textarea rows={5} value={editing.text || ''} onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Type the question exactly as it should appear on the paper" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CO</label>
                  <select value={editing.courseOutcomeId || ''} onChange={(e) => setEditing({ ...editing, courseOutcomeId: e.target.value || null })}
                    className="w-full rounded border border-slate-300 px-2 py-2 text-sm text-slate-900">
                    <option value="">—</option>
                    {outcomes.map((o) => (<option key={o.id} value={o.id}>{o.code}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty *</label>
                  <select value={editing.difficulty || 'MEDIUM'} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as Question['difficulty'] })}
                    className="w-full rounded border border-slate-300 px-2 py-2 text-sm text-slate-900">
                    {DIFFICULTIES.map((d) => (<option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type *</label>
                  <select value={editing.type || 'TEN_MARK'} onChange={(e) => setEditing({ ...editing, type: e.target.value as Question['type'] })}
                    className="w-full rounded border border-slate-300 px-2 py-2 text-sm text-slate-900">
                    {TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : editing.id ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Outcomes({ courseId, outcomes, reload }: { courseId: string; outcomes: Outcome[]; reload: () => Promise<void> }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!code.trim()) { toast.error('CO code is required'); return; }
    try {
      setSaving(true);
      await apiClient.post(`/exams/courses/${courseId}/outcomes`, { code: code.trim(), description: description.trim() || null });
      toast.success('CO added');
      setCode(''); setDescription('');
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not add the CO');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o: Outcome) => {
    if (!confirm(`Remove ${o.code}? Questions keep their text but lose the CO tag.`)) return;
    try {
      const { data } = await apiClient.delete(`/exams/outcomes/${o.id}`);
      toast.success(data.message || 'Removed');
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><FiTarget className="h-4 w-4 text-indigo-500" /> Add a course outcome</div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CO1"
              className="w-28 rounded border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          </div>
          <div className="min-w-[240px] flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the student should be able to do"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          </div>
          <button type="button" onClick={add} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            <FiPlus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {outcomes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          No course outcomes yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {outcomes.map((o) => (
            <li key={o.id} className="flex items-start gap-3 p-3">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">{o.code}</span>
              <p className="flex-1 text-sm text-slate-700">{o.description || <span className="italic text-slate-400">No description</span>}</p>
              <button type="button" onClick={() => remove(o)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function People({ courseId, assignees, reload }: { courseId: string; assignees: Person[]; reload: () => Promise<void> }) {
  const [staff, setStaff] = useState<Person[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/exams/staff');
        setStaff(data.staff || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const assignedIds = new Set(assignees.map((a) => a.id));
  const options = staff.filter((s) => {
    if (assignedIds.has(s.id)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.email, s.role].some((v) => (v || '').toLowerCase().includes(q));
  });

  const assign = async () => {
    if (picked.length === 0) { toast.error('Pick at least one person'); return; }
    try {
      setSaving(true);
      const { data } = await apiClient.post(`/exams/courses/${courseId}/assignees`, { userIds: picked });
      toast.success(data.message || 'Assigned');
      setPicked([]);
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not assign');
    } finally {
      setSaving(false);
    }
  };

  const unassign = async (p: Person) => {
    if (!confirm(`Remove ${p.name} from this course?`)) return;
    try {
      await apiClient.delete(`/exams/courses/${courseId}/assignees/${p.id}`);
      toast.success('Removed');
      await reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not remove');
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><FiUsers className="h-4 w-4 text-blue-600" /> Assigned to this course</div>
        {assignees.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 italic">Nobody yet — assign staff below so they can add COs and questions.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {assignees.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm text-blue-800">
                <span className="font-semibold">{a.name}</span>
                <span className="text-xs text-blue-500">{a.role}</span>
                <button type="button" onClick={() => unassign(a)} className="text-blue-400 hover:text-red-600"><FiX className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-bold text-slate-900">Add people</span>
          <span className="text-xs text-slate-500">{picked.length} selected</span>
          <div className="relative ml-auto">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff…"
              className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm text-slate-900" />
          </div>
          <button type="button" onClick={assign} disabled={saving || picked.length === 0}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </div>
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {options.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2">
              <input type="checkbox" checked={picked.includes(s.id)} className="h-4 w-4 accent-blue-600"
                onChange={(e) => setPicked((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900">{s.name}</div>
                <div className="text-[11px] text-slate-500">{s.email} · {s.role}</div>
              </div>
            </li>
          ))}
          {options.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500 italic">No one left to add.</li>}
        </ul>
      </div>
    </div>
  );
}

function PaperBuilder({ courseId, course }: { courseId: string; course: Course }) {
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState({
    examName: `MBA End Trimester Examination ${new Date().getFullYear()}`,
    trimester: course.trimester || 'I Trimester',
    courseTitle: course.title,
    paperCode: course.code,
    time: '3:00 Hours',
    maxMarks: '100',
  });

  const shuffle = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/exams/courses/${courseId}/paper/preview`, { params: { difficulty } });
      setPreview(data);
      if (data.shortfall?.length) toast.error(`Bank is short: ${data.shortfall.join(', ')}`, { duration: 6000 });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not build a paper');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { shuffle(); /* eslint-disable-next-line */ }, [difficulty]);

  const download = async () => {
    if (!preview) return;
    const ids = (preview.mains || []).flat().filter(Boolean).map((q: Question) => q.id);
    if (ids.length !== 9) { toast.error('Need 9 ten-mark questions of this difficulty in the bank'); return; }
    try {
      const res = await apiClient.post(`/exams/courses/${courseId}/paper`,
        { questionIds: ids, caseStudyId: preview.caseStudy?.id || null, header },
        { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course.code}-question-paper.docx`.replace(/\s+/g, '-');
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('Question paper downloaded');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Download failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900">
              {DIFFICULTIES.map((d) => (<option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>))}
              <option value="">Any difficulty</option>
            </select>
          </div>
          <button type="button" onClick={shuffle} disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <FiRefreshCw className="h-4 w-4" /> {loading ? 'Picking…' : 'Shuffle again'}
          </button>
          <button type="button" onClick={download} disabled={!preview || (preview.shortfall || []).length > 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            <FiDownload className="h-4 w-4" /> Download .docx
          </button>
          {preview && (
            <span className="text-xs text-slate-500">
              bank has {preview.available.tenMark} ten-mark · {preview.available.caseStudy} case study
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([
            ['examName', 'Examination'], ['trimester', 'Trimester'], ['courseTitle', 'Course title'],
            ['paperCode', 'Paper code'], ['time', 'Time'], ['maxMarks', 'Max marks'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
              <input value={(header as Record<string, string>)[key]}
                onChange={(e) => setHeader({ ...header, [key]: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </div>
          ))}
        </div>
      </div>

      {preview && (preview.shortfall || []).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          The bank needs {preview.shortfall.join(' and ')} at this difficulty before a paper can be made.
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-center">
            <p className="font-bold text-slate-900">{header.examName}</p>
            <p className="font-semibold text-slate-800">{header.trimester}</p>
            <p className="font-semibold text-slate-800">{header.courseTitle}</p>
            <p className="mt-1 text-sm text-slate-600">Time: {header.time} · MM: {header.maxMarks} · Paper Code: {header.paperCode}</p>
          </div>
          <p className="mt-4 text-center text-sm font-bold text-slate-900">Section A</p>
          {(preview.mains || []).map((subs: Question[], i: number) => (
            <div key={i} className="mt-3">
              <div className="flex justify-between text-sm font-bold text-slate-900"><span>Q{i + 1}.</span><span>10x2 Marks</span></div>
              <ol className="mt-1 space-y-1 pl-5 text-sm text-slate-700">
                {['a', 'b', 'c'].map((letter, j) => (
                  <li key={letter}>
                    <span className="font-semibold">{letter})</span>{' '}
                    {subs[j]
                      ? <>{subs[j].text} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${diffClass(subs[j].difficulty)}`}>{subs[j].difficulty}</span>{subs[j].outcomeCode && <span className="ml-1 text-[10px] text-indigo-600">{subs[j].outcomeCode}</span>}</>
                      : <span className="italic text-red-500">no question available</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <p className="mt-4 text-center text-sm font-bold text-slate-900">Section B</p>
          <div className="mt-1 flex justify-between text-sm font-bold text-slate-900"><span>Q4. Case Study</span><span>(40 Marks)</span></div>
          <p className="mt-1 whitespace-pre-line pl-5 text-sm text-slate-700">
            {preview.caseStudy ? preview.caseStudy.text : <span className="italic text-red-500">no case study in the bank at this difficulty</span>}
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
            <FiHelpCircle className="h-3.5 w-3.5" /> Difficulty and CO tags are shown here only — they are not printed on the paper.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ExamCoursePage() {
  return (
    <ExamShell>
      <Content />
    </ExamShell>
  );
}
