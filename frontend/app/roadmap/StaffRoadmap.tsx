'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiX, FiTrash2, FiEdit2, FiCheck, FiSearch, FiUsers, FiFlag, FiClock,
  FiTarget, FiBookOpen, FiAward, FiBriefcase, FiCalendar, FiStar, FiZap, FiCheckCircle, FiArrowLeft, FiEye,
  FiMaximize2, FiRotateCcw, FiUserCheck, FiUser, FiRefreshCw,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import Timeline from './Timeline';
import RoadmapCanvas from './RoadmapCanvas';
import Portal from './Portal';
import { Goal, Milestone, MILESTONE_ICONS, Question, Roadmap, SessionInfo, daysUntil, fmtDate } from './types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  target: FiTarget, flag: FiFlag, book: FiBookOpen, award: FiAward, briefcase: FiBriefcase,
  users: FiUsers, calendar: FiCalendar, star: FiStar, zap: FiZap, check: FiCheckCircle,
};

type GoalRow = Goal & {
  studentId: string; studentName: string; studentEmail: string; registrationNumber: string; sessionName: string;
};
type StudentRow = {
  id: string; name: string; email: string; registrationNumber: string; sectionName: string;
  goalStatus: string; goalTitle: string; goalId: string | null; selfMilestones: number; answered: number;
  milestones?: number;
};
type PickerStudent = {
  id: string; name: string; email: string; registrationNumber: string; sectionName: string; isMentee: boolean;
};
type ResponseView = {
  milestone: Milestone;
  answeredCount: number;
  totalStudents: number;
  students: { studentId: string; name: string; email: string; registrationNumber: string; answered: boolean; answers: Record<string, string>; submittedAt: string | null }[];
};

const GOAL_STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-800',
  REJECTED: 'bg-rose-50 text-rose-700',
  NONE: 'bg-gray-100 text-gray-500',
};

export default function StaffRoadmap() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [tab, setTab] = useState<'goals' | 'milestones' | 'students' | 'questions'>('goals');
  const [menteesOnly, setMenteesOnly] = useState(false);
  const [menteeCount, setMenteeCount] = useState(0);
  const [picker, setPicker] = useState<PickerStudent[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsDefault, setQuestionsDefault] = useState(true);
  const [canEditQuestions, setCanEditQuestions] = useState(false);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [goalFilter, setGoalFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Partial<Milestone> | null>(null);
  const [responses, setResponses] = useState<ResponseView | null>(null);
  const [viewing, setViewing] = useState<Roadmap | null>(null);
  const [rejecting, setRejecting] = useState<GoalRow | null>(null);
  const [note, setNote] = useState('');
  const [canvas, setCanvas] = useState(false);
  const [canManageGoals, setCanManageGoals] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);
  const [goalDraft, setGoalDraft] = useState('');
  const [deletingGoal, setDeletingGoal] = useState<GoalRow | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/roadmap/sessions');
        const list: SessionInfo[] = data.sessions || [];
        setSessions(list);
        setSessionId((prev) => prev || list.find((s) => s.isActive)?.id || list[0]?.id || '');
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load sessions');
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const mine = menteesOnly ? { menteesOnly: 1 } : {};
      const [g, m, s, p, q] = await Promise.all([
        apiClient.get('/roadmap/goals', { params: { sessionId, status: goalFilter, ...mine } }),
        apiClient.get('/roadmap/milestones', { params: { sessionId, ...mine } }),
        apiClient.get('/roadmap/students', { params: { sessionId, ...mine } }),
        apiClient.get('/roadmap/session-students', { params: { sessionId } }),
        apiClient.get('/roadmap/goal-questions'),
      ]);
      setGoals(g.data.goals || []);
      setCanManageGoals(!!g.data.canManage);
      setMilestones(m.data.milestones || []);
      setStudents(s.data.students || []);
      setMenteeCount(s.data.menteeCount || 0);
      setPicker(p.data.students || []);
      setQuestions(q.data.questions || []);
      setQuestionsDefault(!!q.data.isDefault);
      setCanEditQuestions(!!q.data.canEdit);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load the roadmap data');
    } finally {
      setLoading(false);
    }
  }, [sessionId, goalFilter, menteesOnly]);
  useEffect(() => { load(); }, [load]);

  const session = sessions.find((s) => s.id === sessionId) || null;
  const pendingGoals = goals.filter((g) => g.status === 'PENDING').length;

  const decide = async (goal: GoalRow, decision: 'APPROVE' | 'REJECT', reason?: string) => {
    try {
      setBusy(true);
      const { data } = await apiClient.post(`/roadmap/goals/${goal.id}/decide`, { decision, note: reason || null });
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

  const saveGoalEdit = async () => {
    if (!editingGoal) return;
    if (!goalDraft.trim()) { toast.error('The goal cannot be empty'); return; }
    try {
      setBusy(true);
      const { data } = await apiClient.patch(`/roadmap/goals/${editingGoal.id}`, { title: goalDraft.trim() });
      toast.success(data.message || 'Goal updated');
      setEditingGoal(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update the goal');
    } finally {
      setBusy(false);
    }
  };

  // Putting an approved goal back in front of the student.
  const reopenGoal = async (goal: GoalRow) => {
    if (!confirm(`Send ${goal.studentName}'s approved goal back for a rethink?`)) return;
    try {
      setBusy(true);
      await apiClient.patch(`/roadmap/goals/${goal.id}`, { status: 'PENDING' });
      toast.success('Sent back — the student can edit it again');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to send it back');
    } finally {
      setBusy(false);
    }
  };

  const deleteGoal = async () => {
    if (!deletingGoal) return;
    try {
      setBusy(true);
      const { data } = await apiClient.delete(`/roadmap/goals/${deletingGoal.id}`, {
        data: { reason: deleteReason.trim() || null },
      });
      toast.success(data.message || 'Goal removed');
      setDeletingGoal(null);
      setDeleteReason('');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete the goal');
    } finally {
      setBusy(false);
    }
  };

  const saveMilestone = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast.error('Title is required'); return; }
    if (!editing.dueDate) { toast.error('Pick a date'); return; }
    try {
      setBusy(true);
      const payload = {
        academicSessionId: editing.academicSessionId || sessionId,
        userId: editing.userId || null,
        title: editing.title.trim(),
        description: editing.description || null,
        dueDate: editing.dueDate,
        icon: editing.icon || 'target',
        questions: (editing.questions || []).filter((q) => q.label?.trim()),
      };
      const { data } = editing.id
        ? await apiClient.patch(`/roadmap/milestones/${editing.id}`, payload)
        : await apiClient.post('/roadmap/milestones', payload);
      toast.success(data.message || 'Milestone saved');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save the milestone');
    } finally {
      setBusy(false);
    }
  };

  const removeMilestone = async (m: Milestone) => {
    if (!confirm(`Delete "${m.title}"? Any answers students gave go too.`)) return;
    try {
      const { data } = await apiClient.delete(`/roadmap/milestones/${m.id}`);
      toast.success(data.message || 'Removed');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete');
    }
  };

  const openResponses = async (m: Milestone) => {
    try {
      const { data } = await apiClient.get(`/roadmap/milestones/${m.id}/responses`);
      setResponses(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load responses');
    }
  };

  const openStudent = async (row: StudentRow) => {
    try {
      const { data } = await apiClient.get(`/roadmap/student/${row.id}`);
      setViewing(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load that roadmap');
    }
  };

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => [s.name, s.email, s.registrationNumber, s.sectionName, s.goalTitle]
      .some((v) => (v || '').toLowerCase().includes(q)));
  }, [students, query]);

  // ── One student's roadmap, read-only ──────────────────────────
  if (viewing) {
    const viewedGoalDate = viewing.session?.endDate || viewing.goal?.targetDate || null;
    const viewedDays = daysUntil(viewedGoalDate);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setViewing(null)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><FiArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{viewing.student?.name || 'Student'}</h1>
            <p className="text-xs text-gray-500">
              {viewing.student?.registrationNumber ? `${viewing.student.registrationNumber} · ` : ''}
              {viewing.session?.name || 'No session'}
            </p>
          </div>
          {viewing.goal && (
            <span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${GOAL_STATUS_STYLE[viewing.goal.status] || ''}`}>
              Goal {viewing.goal.status.toLowerCase()}
            </span>
          )}
        </div>

        {viewing.goal ? (
          <div className="rm-stage overflow-hidden rounded-3xl border border-white/60">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25">
                  <FiFlag className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-gray-900">{viewing.goal.title}</div>
                  <div className="text-[11px] text-gray-500">By the end of the session · {fmtDate(viewedGoalDate)}</div>
                </div>
              </div>
              <div className={`flex-none rounded-2xl px-4 py-2 text-center ring-1 ${
                viewedDays === null ? 'bg-gray-100 text-gray-600 ring-gray-200'
                  : viewedDays < 0 ? 'bg-rose-50 text-rose-700 ring-rose-200'
                    : 'bg-blue-50 text-blue-700 ring-blue-200'
              }`}>
                <div className="text-xl font-bold leading-none tabular-nums">
                  {viewedDays === null ? '—' : viewedDays < 0 ? `−${Math.abs(viewedDays)}` : viewedDays}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">days left</div>
              </div>
            </div>
            <Timeline
              variant="preview"
              startDate={viewing.session?.startDate || null}
              endDate={viewedGoalDate}
              goalTitle={viewing.goal.title}
              milestones={viewing.milestones}
              selfMilestones={viewing.selfMilestones}
              onOpen={() => setCanvas(true)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/60 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> {viewing.milestones.length} from faculty</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> {viewing.selfMilestones.length} theirs</span>
              </div>
              <button type="button" onClick={() => setCanvas(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                <FiMaximize2 className="h-4 w-4" /> Open roadmap
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            This student has not set a goal yet, so there is no timeline.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">Their goal answers</h2>
            {viewing.goal ? (
              <dl className="mt-2 space-y-2">
                {viewing.questions.map((q) => (
                  <div key={q.id}>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{q.label}</dt>
                    <dd className="whitespace-pre-line text-sm text-gray-800">{viewing.goal?.answers?.[q.id] || '—'}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="mt-2 text-xs italic text-gray-400">Nothing yet.</p>}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">Their own milestones ({viewing.selfMilestones.length})</h2>
            {viewing.selfMilestones.length === 0 ? (
              <p className="mt-2 text-xs italic text-gray-400">None added.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {viewing.selfMilestones.map((m) => (
                  <li key={m.id} className="py-2">
                    <div className="flex items-center gap-1.5">
                      {m.type === 'ACHIEVEMENT' ? <FiAward className="h-3.5 w-3.5 text-amber-500" /> : <FiStar className="h-3.5 w-3.5 text-emerald-600" />}
                      <span className="text-sm font-semibold text-gray-900">{m.title}</span>
                      <span className="ml-auto text-[11px] text-gray-500">{fmtDate(m.date)}</span>
                    </div>
                    {m.description && <p className="mt-0.5 whitespace-pre-line text-xs text-gray-600">{m.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {canvas && viewing.goal && (
          <RoadmapCanvas
            goalTitle={viewing.goal.title}
            startDate={viewing.session?.startDate || null}
            endDate={viewedGoalDate}
            sessionName={viewing.session?.name}
            milestones={viewing.milestones}
            selfMilestones={viewing.selfMilestones}
            onMilestone={(m) => openResponses(m)}
            readOnlyLabel={`${viewing.student?.name || 'Student'} · read-only`}
            onClose={() => setCanvas(false)}
          />
        )}

        {responses && <ResponsesModal data={responses} onClose={() => setResponses(null)} />}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Roadmap</h1>
          <p className="mt-1 text-sm text-gray-500">
            Approve the goals students set, place milestones on a whole session&apos;s timeline, and read what they fill in.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
            {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          <button type="button"
            onClick={() => setEditing({ academicSessionId: sessionId, icon: 'target', questions: [], dueDate: '' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <FiPlus className="h-4 w-4" /> New milestone
          </button>
        </div>
      </div>

      {session && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-600">
          <span>
            Timeline window · {fmtDate(session.startDate)} → {fmtDate(session.endDate)} · {students.length} student{students.length === 1 ? '' : 's'}
            {menteesOnly ? ' (your mentees)' : ''}
          </span>
          <button
            type="button"
            onClick={() => setMenteesOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              menteesOnly ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiUserCheck className="h-3.5 w-3.5" />
            {menteesOnly ? 'Showing my mentees' : 'Show my mentees only'}
            {menteeCount > 0 && !menteesOnly && <span className="text-gray-400">({menteeCount})</span>}
          </button>
        </div>
      )}

      {menteesOnly && menteeCount === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          You have no mentees in this session, so nothing is listed. Turn the filter off to see everyone.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          ['goals', `Goals${pendingGoals ? ` (${pendingGoals})` : ''}`],
          ['milestones', `Milestones (${milestones.length})`],
          ['students', `Students (${students.length})`],
          ['questions', 'Goal questions'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === key ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : tab === 'goals' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
              <input type="checkbox" checked={goalFilter === 'ALL'} onChange={(e) => setGoalFilter(e.target.checked ? 'ALL' : 'PENDING')} />
              Include decided goals
            </label>
          </div>
          {goals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
              {goalFilter === 'ALL' ? 'No goals set in this session yet.' : 'No goals waiting for approval.'}
            </div>
          ) : goals.map((g) => (
            <div key={g.id} className="rm-rise rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{g.studentName}</span>
                    {g.registrationNumber && <span className="text-[11px] text-gray-500">{g.registrationNumber}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${GOAL_STATUS_STYLE[g.status] || ''}`}>{g.status}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-gray-900">{g.title}</p>
                  <p className="text-[11px] text-gray-500">By the end of the session · {fmtDate(g.targetDate)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {g.status === 'PENDING' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => decide(g, 'APPROVE')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                        <FiCheck className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button type="button" disabled={busy} onClick={() => setRejecting(g)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                        <FiX className="h-3.5 w-3.5" /> Send back
                      </button>
                    </>
                  )}
                  {canManageGoals && (
                    <>
                      {g.status === 'APPROVED' && (
                        <button type="button" disabled={busy} onClick={() => reopenGoal(g)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60">
                          <FiRotateCcw className="h-3.5 w-3.5" /> Send back
                        </button>
                      )}
                      <button type="button" onClick={() => { setEditingGoal(g); setGoalDraft(g.title); }} title="Edit the goal"
                        className="rounded-full border border-gray-200 p-2 text-blue-600 hover:bg-blue-50">
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => { setDeletingGoal(g); setDeleteReason(''); }} title="Delete the goal"
                        className="rounded-full border border-gray-200 p-2 text-red-600 hover:bg-red-50">
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <dl className="mt-3 grid gap-2 border-t border-gray-100 pt-3 sm:grid-cols-2">
                {Object.entries(g.answers || {}).filter(([, v]) => String(v || '').trim()).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{k.replace(/_/g, ' ')}</dt>
                    <dd className="whitespace-pre-line text-sm text-gray-700">{v}</dd>
                  </div>
                ))}
              </dl>
              {g.status !== 'PENDING' && (g.approvedByName || g.decisionNote) && (
                <p className="mt-2 text-[11px] text-gray-500">
                  {g.approvedByName ? `${g.status === 'APPROVED' ? 'Approved' : 'Sent back'} by ${g.approvedByName}` : ''}
                  {g.decisionNote ? ` · “${g.decisionNote}”` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : tab === 'milestones' ? (
        milestones.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            No milestones on this session&apos;s timeline yet. Add one with “New milestone”.
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((m) => {
              const Icon = ICONS[m.icon] || FiTarget;
              return (
                <div key={m.id} className="rm-rise rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white"><Icon className="h-4 w-4" /></span>
                        <span className="text-sm font-bold text-gray-900">{m.title}</span>
                      </div>
                      {m.description && <p className="mt-1 whitespace-pre-line text-xs text-gray-600">{m.description}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1"><FiCalendar className="h-3 w-3" /> {fmtDate(m.dueDate)}</span>
                        {m.userId ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                            <FiUser className="h-3 w-3" /> {m.studentName || 'one student'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                            <FiUsers className="h-3 w-3" /> Whole session
                          </span>
                        )}
                        <span>{m.questions.length} question{m.questions.length === 1 ? '' : 's'}</span>
                        <span className="inline-flex items-center gap-1"><FiUsers className="h-3 w-3" /> {m.responseCount || 0} answered</span>
                        {m.createdByName && <span>by {m.createdByName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openResponses(m)}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <FiEye className="h-3.5 w-3.5" /> Responses
                      </button>
                      {m.canEdit !== false && (
                        <>
                          <button type="button" onClick={() => setEditing({ ...m })} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><FiEdit2 className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeMilestone(m)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : tab === 'questions' ? (
        <GoalQuestionsEditor
          questions={questions}
          isDefault={questionsDefault}
          canEdit={canEditQuestions}
          onSaved={load}
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, section, goal…"
                className="w-64 rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm text-gray-900" />
            </div>
            <span className="ml-auto text-xs text-gray-500">
              {students.filter((s) => s.goalStatus === 'APPROVED').length} approved ·{' '}
              {students.filter((s) => s.goalStatus === 'PENDING').length} waiting ·{' '}
              {students.filter((s) => s.goalStatus === 'NONE').length} not set
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Section</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Goal</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Answered</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Own</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-[11px] text-gray-500">{s.registrationNumber || s.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{s.sectionName || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${GOAL_STATUS_STYLE[s.goalStatus] || ''}`}>
                        {s.goalStatus === 'NONE' ? 'NOT SET' : s.goalStatus}
                      </span>
                      {s.goalTitle && <div className="mt-0.5 max-w-[260px] truncate text-xs text-gray-600">{s.goalTitle}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 tabular-nums">{s.answered}/{s.milestones ?? milestones.length}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 tabular-nums">{s.selfMilestones}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => openStudent(s)}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Open roadmap
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleStudents.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-500">No students match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / edit a milestone */}
      {editing && (
        <Portal>
        <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="rm-rise max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">{editing.id ? 'Edit milestone' : 'New milestone'}</h3>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="mb-2 text-xs font-semibold text-gray-700">Who gets this milestone?</div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditing({ ...editing, userId: null })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      !editing.userId ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <FiUsers className="h-3.5 w-3.5" /> Everyone in the session
                  </button>
                  <button type="button" onClick={() => setEditing({ ...editing, userId: editing.userId || picker[0]?.id || '' })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      editing.userId ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <FiUser className="h-3.5 w-3.5" /> One student
                  </button>
                </div>
                {editing.userId ? (
                  <select value={editing.userId} onChange={(e) => setEditing({ ...editing, userId: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900">
                    <option value="">Choose a student…</option>
                    {picker.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.registrationNumber ? ` · ${p.registrationNumber}` : ''}{p.sectionName ? ` · ${p.sectionName}` : ''}{p.isMentee ? ' · my mentee' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-2 text-[11px] text-gray-500">
                    It lands on the timeline of every student in <strong>{session?.name || 'the session'}</strong>.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Summer internship secured" maxLength={300}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                  <input type="date" value={editing.dueDate || ''} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Icon</label>
                  <div className="flex flex-wrap gap-1">
                    {MILESTONE_ICONS.map((key) => {
                      const Icon = ICONS[key] || FiTarget;
                      const on = (editing.icon || 'target') === key;
                      return (
                        <button key={key} type="button" onClick={() => setEditing({ ...editing, icon: key })}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${on ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  maxLength={4000} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Questions for the students</span>
                  <button type="button"
                    onClick={() => setEditing({
                      ...editing,
                      questions: [...(editing.questions || []), { id: `q${(editing.questions?.length || 0) + 1}`, label: '', type: 'textarea', required: false } as Question],
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline">
                    <FiPlus className="h-3 w-3" /> Add question
                  </button>
                </div>
                {(editing.questions || []).length === 0 ? (
                  <p className="mt-2 text-[11px] italic text-gray-400">No questions — the milestone will just appear on the timeline.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {(editing.questions || []).map((q, i) => (
                      <li key={i} className="rounded-lg bg-gray-50 p-2">
                        <div className="flex items-center gap-2">
                          <input value={q.label} onChange={(e) => {
                            const next = [...(editing.questions || [])];
                            next[i] = { ...q, label: e.target.value };
                            setEditing({ ...editing, questions: next });
                          }} placeholder={`Question ${i + 1}`} maxLength={500}
                            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900" />
                          <button type="button" onClick={() => setEditing({ ...editing, questions: (editing.questions || []).filter((_, j) => j !== i) })}
                            className="rounded p-1.5 text-red-600 hover:bg-red-100"><FiTrash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <select value={q.type} onChange={(e) => {
                            const next = [...(editing.questions || [])];
                            next[i] = { ...q, type: e.target.value as Question['type'] };
                            setEditing({ ...editing, questions: next });
                          }} className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-700">
                            <option value="textarea">Long answer</option>
                            <option value="text">Short answer</option>
                            <option value="choice">Choice</option>
                          </select>
                          {q.type === 'choice' && (
                            <input value={(q.options || []).join(', ')} onChange={(e) => {
                              const next = [...(editing.questions || [])];
                              next[i] = { ...q, options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) };
                              setEditing({ ...editing, questions: next });
                            }} placeholder="Option one, option two"
                              className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-700" />
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-gray-600">
                            <input type="checkbox" checked={!!q.required} onChange={(e) => {
                              const next = [...(editing.questions || [])];
                              next[i] = { ...q, required: e.target.checked };
                              setEditing({ ...editing, questions: next });
                            }} /> required
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-5 py-4">
              <button type="button" onClick={() => setEditing(null)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={saveMilestone} disabled={busy}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {busy ? 'Saving…' : editing.id ? 'Save' : 'Add to timeline'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Edit a goal's wording */}
      {editingGoal && (
        <Portal>
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-4">
          <div className="rm-rise w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">Edit the goal</h3>
              <button type="button" onClick={() => setEditingGoal(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-xs text-gray-500">{editingGoal.studentName} · {editingGoal.status.toLowerCase()}</p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Goal</label>
                <textarea rows={3} value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} maxLength={500}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>
              <p className="text-[11px] text-gray-400">The student keeps their own answers; only the goal line changes.</p>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button type="button" onClick={() => setEditingGoal(null)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={busy} onClick={saveGoalEdit}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Delete a goal */}
      {deletingGoal && (
        <Portal>
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-4">
          <div className="rm-rise w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">Delete this goal</h3>
              <button type="button" onClick={() => setDeletingGoal(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-gray-600">
                {deletingGoal.studentName}&apos;s goal “{deletingGoal.title}” is removed, along with the milestones and
                achievements they added themselves. They open the roadmap to a fresh setup, with a note saying you removed it.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for the student (optional)</label>
                <textarea rows={3} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} maxLength={2000}
                  placeholder="e.g. Set a goal tied to your specialisation"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button type="button" onClick={() => setDeletingGoal(null)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={busy} onClick={deleteGoal}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {busy ? 'Deleting…' : 'Delete goal'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Send a goal back */}
      {rejecting && (
        <Portal>
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-4">
          <div className="rm-rise w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">Send this goal back</h3>
              <button type="button" onClick={() => { setRejecting(null); setNote(''); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-gray-600">
                {rejecting.studentName} can rewrite their answers and submit again. Their timeline stays hidden until a goal is approved.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">What should they change? (optional)</label>
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000}
                  placeholder="e.g. Make the goal measurable and pick a nearer date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button type="button" onClick={() => { setRejecting(null); setNote(''); }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={busy} onClick={() => decide(rejecting, 'REJECT', note.trim() || undefined)}
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {busy ? 'Sending…' : 'Send back'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {responses && <ResponsesModal data={responses} onClose={() => setResponses(null)} />}
    </div>
  );
}

// The questions the goal orb asks every student. Editing them leaves
// answers already given attached to their question ids.
function GoalQuestionsEditor({ questions, isDefault, canEdit, onSaved }: {
  questions: Question[];
  isDefault: boolean;
  canEdit: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Question[]>(questions);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDraft(questions); }, [questions]);

  const update = (i: number, patch: Partial<Question>) =>
    setDraft((prev) => prev.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, by: number) => setDraft((prev) => {
    const next = [...prev];
    const to = i + by;
    if (to < 0 || to >= next.length) return prev;
    [next[i], next[to]] = [next[to], next[i]];
    return next;
  });

  const save = async () => {
    if (draft.some((q) => !q.label.trim())) { toast.error('Every question needs wording'); return; }
    try {
      setBusy(true);
      const { data } = await apiClient.put('/roadmap/goal-questions', { questions: draft });
      toast.success(data.message || 'Saved');
      await onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save the questions');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm('Go back to the default questions?')) return;
    try {
      setBusy(true);
      const { data } = await apiClient.put('/roadmap/goal-questions', { reset: true });
      toast.success(data.message || 'Reset');
      await onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to reset');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Goal questions</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              What the orb asks a student before they set their goal. The first question is the goal itself.
              {isDefault ? ' These are the defaults.' : ''}
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={reset} disabled={busy || isDefault}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                <FiRefreshCw className="h-3.5 w-3.5" /> Defaults
              </button>
              <button type="button" onClick={() => setDraft([...draft, { id: `q${draft.length + 1}_${Date.now().toString(36)}`, label: '', type: 'textarea', required: false }])}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <FiPlus className="h-3.5 w-3.5" /> Add question
              </button>
              <button type="button" onClick={save} disabled={busy}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {busy ? 'Saving…' : 'Save questions'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <p className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-500">
          Only an admin, HOD or coordinator can change these.
        </p>
      )}

      <ul className="space-y-2">
        {draft.map((q, i) => (
          <li key={q.id} className="rounded-2xl border border-gray-200 bg-white p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 w-5 flex-none text-center text-xs font-bold text-gray-400">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-2">
                <textarea
                  rows={2}
                  value={q.label}
                  readOnly={!canEdit}
                  onChange={(e) => update(i, { label: e.target.value })}
                  maxLength={500}
                  placeholder="e.g. What do you want to achieve by the end of this programme?"
                  className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 ${canEdit ? '' : 'bg-gray-50'}`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={q.type} disabled={!canEdit} onChange={(e) => update(i, { type: e.target.value as Question['type'] })}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-700 disabled:bg-gray-50">
                    <option value="textarea">Long answer</option>
                    <option value="text">Short answer</option>
                    <option value="choice">Choice</option>
                  </select>
                  {q.type === 'choice' && (
                    <input value={(q.options || []).join(', ')} disabled={!canEdit}
                      onChange={(e) => update(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                      placeholder="Option one, option two"
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-700 disabled:bg-gray-50" />
                  )}
                  <label className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                    <input type="checkbox" checked={!!q.required} disabled={!canEdit}
                      onChange={(e) => update(i, { required: e.target.checked })} /> required
                  </label>
                  <span className="text-[10px] text-gray-400">id: {q.id}</span>
                </div>
              </div>
              {canEdit && (
                <div className="flex flex-none flex-col items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                    className="rounded px-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === draft.length - 1}
                    className="rounded px-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                    className="rounded p-1 text-red-600 hover:bg-red-50"><FiTrash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResponsesModal({ data, onClose }: { data: ResponseView; onClose: () => void }) {
  const [onlyAnswered, setOnlyAnswered] = useState(true);
  const rows = onlyAnswered ? data.students.filter((s) => s.answered) : data.students;
  return (
    <Portal>
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="rm-rise max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">{data.milestone.title}</h3>
            <p className="text-xs text-gray-500">
              {fmtDate(data.milestone.dueDate)} · {data.answeredCount} of {data.totalStudents} answered
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
            <input type="checkbox" checked={onlyAnswered} onChange={(e) => setOnlyAnswered(e.target.checked)} />
            Only those who answered
          </label>
        </div>
        <div className="space-y-3 px-5 pb-5">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm italic text-gray-400">Nobody has answered this yet.</p>
          ) : rows.map((s) => (
            <div key={s.studentId} className="rounded-2xl border border-gray-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                  <div className="text-[11px] text-gray-500">{s.registrationNumber || s.email}</div>
                </div>
                {s.answered ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <FiCheck className="h-3 w-3" /> {fmtDate(s.submittedAt)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    <FiClock className="h-3 w-3" /> No answer
                  </span>
                )}
              </div>
              {s.answered && (
                <dl className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                  {data.milestone.questions.map((q) => (
                    <div key={q.id}>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{q.label}</dt>
                      <dd className="whitespace-pre-line text-sm text-gray-800">{s.answers[q.id] || '—'}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    </Portal>
  );
}
