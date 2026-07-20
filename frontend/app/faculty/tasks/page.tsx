'use client';

// Faculty (and any non-student non-admin assignee) view of tasks assigned
// to them. Tasks render as a vertical, date-grouped timeline with a
// priority badge per task. When admin leaves a remark on a submission it
// shows as a prominent "Feedback from admin" callout. Mark-done supports
// an optional supporting document upload.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiCheck, FiClock, FiCalendar, FiPaperclip, FiAlertCircle,
  FiFileText, FiDownload, FiUpload, FiX, FiFlag, FiMessageSquare,
  FiUsers, FiTrendingUp,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import FacultyTaskExtras from '@/app/components/FacultyTaskExtras';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const PRIORITY_STYLE: Record<Priority, { chip: string; dot: string; ring: string; label: string }> = {
  URGENT: { chip: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-600', ring: 'ring-red-200', label: 'Urgent' },
  HIGH:   { chip: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500', ring: 'ring-orange-200', label: 'High' },
  MEDIUM: { chip: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500', ring: 'ring-blue-200', label: 'Medium' },
  LOW:    { chip: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400', ring: 'ring-gray-200', label: 'Low' },
};

interface Task {
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  status: 'PENDING' | 'COMPLETED';
  priority: Priority;
  completedAt?: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  createdAt: string;
  adminRemark?: string | null;
  remarkedAt?: string | null;
  groupTaskId?: string | null;
  sharedCompletion?: boolean;
  submittedLate?: boolean;
  extensionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  extensionRequestedDeadline?: string | null;
  extensionRequestReason?: string | null;
  extensionRequestedAt?: string | null;
  extensionRespondedAt?: string | null;
  extensionResponseReason?: string | null;
  approvedAt?: string | null;
  extraDocuments?: Array<{
    url: string;
    name: string;
    mime?: string | null;
    uploadedAt?: string;
    uploadedBy?: string;
  }> | null;
  Assigner?: { id: string; firstName: string; lastName: string | null; email: string };
  Remarker?: { id: string; firstName: string; lastName: string | null; email: string };
  Approver?: { id: string; firstName: string; lastName: string | null; email: string } | null;
}

interface Accuracy {
  percentage: number | null;
  evaluable: number;
  sampleSize: number;
  breakdown?: {
    completedOnTime: number;
    completedLate1: number;
    completedLate7: number;
    completedLateMore: number;
    overduePending: number;
    notDueYet: number;
    awaitingApproval: number;
  };
}

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : '—');
const fmtDateShort = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : '—');
const fmtTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

const dayKey = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Absolute date only — no Today/Yesterday shortcuts, so a viewer sees
// the exact deadline day at a glance. Per-task rows also print the
// full date + time next to this header.
const prettyDay = (key: string) => {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function MyTasksPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');

  // Mark-done modal state
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only people who can be assignees should reach this page
  useEffect(() => {
    if (!user) return;
    const ok = ['HOD', 'FACULTY', 'CHAIR_HEAD', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR', 'ADMIN'].includes(user.role);
    if (!ok) router.push('/dashboard');
  }, [user, router]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Always scope to the current user — admin/HOD/coordinator would
      // otherwise get the org-wide list from the /faculty-tasks endpoint.
      const [tRes, aRes] = await Promise.all([
        apiClient.get('/faculty-tasks', { params: { assigneeId: user.id } }),
        apiClient.get('/faculty-tasks/accuracy'),
      ]);
      setTasks(tRes.data.tasks || []);
      setAccuracy(aRes.data || null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const pending = tasks.filter((t) => t.status === 'PENDING');
  const completed = tasks.filter((t) => t.status === 'COMPLETED');
  const visible = tab === 'pending' ? pending : completed;

  // Date-grouped timeline. For pending, group by deadline (or createdAt if no
  // deadline); for completed, group by completedAt. This makes "Today",
  // "Tomorrow" naturally sort into useful sections.
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of visible) {
      const anchor =
        tab === 'completed' ? (t.completedAt || t.createdAt)
        : (t.deadline || t.createdAt);
      const k = dayKey(anchor);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    // For pending: ascending (soonest deadline first). For completed: descending (latest first).
    return Array.from(map.entries()).sort((a, b) =>
      tab === 'completed' ? (a[0] < b[0] ? 1 : -1) : (a[0] < b[0] ? -1 : 1)
    );
  }, [visible, tab]);

  const onOpenAction = (t: Task) => { setActionTask(t); setFileToUpload(null); };
  const onCloseAction = () => { setActionTask(null); setFileToUpload(null); };

  const submitComplete = async () => {
    if (!actionTask) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (fileToUpload) fd.append('document', fileToUpload);
      await apiClient.patch(`/faculty-tasks/${actionTask.id}/complete`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Task marked done');
      onCloseAction();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to mark done');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="My Tasks">
      <div className="py-6 px-2 md:px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-1 text-sm">Tasks assigned to you by the admin — sorted by deadline.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
          >
            <FiArrowLeft /> Back
          </button>
        </div>

        {/* Accuracy card */}
        {accuracy && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${accuracy.percentage == null ? 'bg-gray-100 text-gray-500' : accuracy.percentage >= 80 ? 'bg-green-100 text-green-700' : accuracy.percentage >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                <FiTrendingUp size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Accuracy</p>
                {accuracy.percentage == null ? (
                  <p className="text-2xl font-bold text-gray-600">—</p>
                ) : (
                  <p className={`text-3xl font-bold ${accuracy.percentage >= 80 ? 'text-green-600' : accuracy.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {accuracy.percentage}%
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">based on {accuracy.evaluable} evaluable task{accuracy.evaluable === 1 ? '' : 's'}</p>
              </div>
            </div>
            {accuracy.breakdown && (
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5">
                  <span className="font-bold text-green-700">{accuracy.breakdown.completedOnTime}</span>
                  <span className="text-gray-600"> on time</span>
                  <span className="block text-[10px] text-gray-500">+5 each</span>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">
                  <span className="font-bold text-yellow-700">{accuracy.breakdown.completedLate1}</span>
                  <span className="text-gray-600"> ≤1d late</span>
                  <span className="block text-[10px] text-gray-500">+1 each</span>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                  <span className="font-bold text-orange-700">{accuracy.breakdown.completedLate7}</span>
                  <span className="text-gray-600"> ≤7d late</span>
                  <span className="block text-[10px] text-gray-500">−1 each</span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  <span className="font-bold text-red-700">{accuracy.breakdown.completedLateMore}</span>
                  <span className="text-gray-600"> &gt;7d late</span>
                  <span className="block text-[10px] text-gray-500">−3 each</span>
                </div>
                <div className="bg-red-100 border border-red-300 rounded px-2 py-1.5">
                  <span className="font-bold text-red-800">{accuracy.breakdown.overduePending}</span>
                  <span className="text-gray-700"> overdue</span>
                  <span className="block text-[10px] text-gray-600">−5 each</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                  <span className="font-bold text-gray-700">{accuracy.breakdown.notDueYet}</span>
                  <span className="text-gray-600"> upcoming</span>
                  <span className="block text-[10px] text-gray-500">no effect</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded px-2 py-1.5 col-span-2 sm:col-span-3">
                  <span className="font-bold text-indigo-700">{accuracy.breakdown.awaitingApproval}</span>
                  <span className="text-gray-700"> awaiting approval</span>
                  <span className="block text-[10px] text-gray-500">held out of score until admin approves</span>
                </div>
              </div>
            )}
            <p className="text-[10px] text-gray-500 w-full">Base 100. Score floor 0, no ceiling. Positive credit applies only after the assigner approves your submission.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4 flex">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 ${
              tab === 'pending'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiClock /> Pending
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full px-2 py-0.5">{pending.length}</span>
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 ${
              tab === 'completed'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiCheck /> Completed
            <span className="bg-green-100 text-green-800 text-xs font-bold rounded-full px-2 py-0.5">{completed.length}</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
            {tab === 'pending' ? 'No pending tasks 🎉' : 'No completed tasks yet.'}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6">
            {grouped.map(([day, dayTasks]) => (
              <div key={day} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3 ml-1">
                  <FiCalendar className="text-gray-400" size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    {tab === 'completed' ? `Completed ${prettyDay(day)}` : `Due ${prettyDay(day)}`}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <ol className="relative border-l-2 border-gray-200 ml-3 space-y-4">
                  {dayTasks.map((t) => {
                    const overdue = t.status === 'PENDING' && t.deadline && new Date(t.deadline).getTime() < Date.now();
                    const pStyle = PRIORITY_STYLE[t.priority];
                    return (
                      <li key={t.id} className="ml-5 relative">
                        <span
                          className={`absolute -left-[1.875rem] top-1 w-4 h-4 rounded-full ring-4 ${pStyle.dot} ${pStyle.ring}`}
                          aria-hidden
                        />
                        <div className={`rounded-lg border bg-white shadow-sm hover:shadow transition ${overdue ? 'border-red-300' : 'border-gray-200'}`}>
                          <div className="p-3 md:p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-lg font-bold text-gray-900">{t.title}</h3>
                                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold ${pStyle.chip}`}>
                                    <FiFlag size={10} /> {pStyle.label}
                                  </span>
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                                    t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {t.status === 'COMPLETED' ? 'COMPLETED' : overdue ? 'OVERDUE' : 'PENDING'}
                                  </span>
                                  {t.submittedLate && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-300" title="Submitted after the deadline">
                                      SUBMITTED LATE
                                    </span>
                                  )}
                                  {t.sharedCompletion && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 border border-purple-300" title="Group task — completing it marks it done for everyone in the group">
                                      <FiUsers size={10} /> Group task
                                    </span>
                                  )}
                                  {t.status === 'COMPLETED' && (
                                    t.approvedAt ? (
                                      <span
                                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        title={`Approved by ${t.Approver ? `${t.Approver.firstName} ${t.Approver.lastName || ''}` : 'assigner'} on ${fmtDate(t.approvedAt)}`}
                                      >
                                        <FiCheck size={10} /> Approved
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300"
                                        title="Assigner hasn't approved yet — positive credit will apply after approval"
                                      >
                                        Awaiting approval
                                      </span>
                                    )
                                  )}
                                </div>
                                {t.description && (
                                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{t.description}</p>
                                )}
                                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-gray-600">
                                  <span className="inline-flex items-center gap-1"><FiClock size={11} /> Assigned {fmtDate(t.createdAt)}</span>
                                  {t.deadline && (
                                    <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-700 font-semibold' : ''}`}>
                                      <FiCalendar size={11} /> Due {fmtDateShort(t.deadline)} {fmtTime(t.deadline)}
                                    </span>
                                  )}
                                  <span>Assigned by: {t.Assigner ? `${t.Assigner.firstName} ${t.Assigner.lastName || ''}` : '—'}</span>
                                  {t.completedAt && <span className="text-green-700">Completed {fmtDate(t.completedAt)}</span>}
                                </div>
                                {t.documentUrl && (
                                  <a
                                    href={t.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm text-blue-700 font-medium border border-blue-200"
                                  >
                                    <FiFileText size={13} />
                                    <span className="max-w-[18rem] truncate">{t.documentName || 'Your submission'}</span>
                                    <FiDownload size={12} />
                                  </a>
                                )}
                                {t.status === 'COMPLETED' && (
                                  <ExtraDocsPanel task={t} onChanged={load} />
                                )}
                              </div>
                              {t.status === 'PENDING' && (
                                <button
                                  onClick={() => onOpenAction(t)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
                                >
                                  <FiCheck /> Mark Done
                                </button>
                              )}
                            </div>

                            {/* Admin remark callout */}
                            {t.adminRemark && (
                              <div className="mt-3 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg p-3 flex items-start gap-2">
                                <FiMessageSquare className="text-indigo-700 mt-0.5 shrink-0" size={16} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-indigo-900 mb-0.5 uppercase tracking-wide">Feedback from admin</p>
                                  <p className="text-sm text-indigo-900 whitespace-pre-wrap">{t.adminRemark}</p>
                                  {t.Remarker && (
                                    <p className="text-[11px] text-indigo-700 mt-1">
                                      — {t.Remarker.firstName} {t.Remarker.lastName || ''} · {fmtDate(t.remarkedAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Extension request + trail */}
                            <FacultyTaskExtras task={t} isAdmin={false} onChanged={load} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mark-done modal */}
      {actionTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-green-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold">Mark task as done</h3>
              <button onClick={onCloseAction} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Task</p>
                <p className="font-bold text-gray-900">{actionTask.title}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Supporting document (optional)
                </label>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-green-600 hover:bg-green-50 transition">
                  <input
                    type="file"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {fileToUpload ? (
                    <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                      <FiPaperclip /> {fileToUpload.name}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setFileToUpload(null); }}
                        className="text-red-600 ml-2"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-600 text-sm">
                      <FiUpload size={20} className="mb-1" />
                      Click to choose a file (PDF, image, doc)
                    </div>
                  )}
                </label>
                <p className="text-xs text-gray-500 mt-1">Max 100 MB. Any file type accepted.</p>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={onCloseAction} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={submitComplete}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-semibold flex items-center gap-2"
              >
                <FiCheck /> {submitting ? 'Submitting…' : 'Mark as done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ---- ExtraDocsPanel ---------------------------------------------------
// Lists supporting documents attached AFTER a task was submitted and
// gives the assignee an upload button. Works even after admin approval.
function ExtraDocsPanel({ task, onChanged }: { task: Task; onChanged: () => Promise<void> | void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const docs = task.extraDocuments || [];

  const onPick = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      await apiClient.post(`/faculty-tasks/${task.id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document added');
      await onChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (idx: number) => {
    if (!confirm('Remove this document?')) return;
    try {
      await apiClient.delete(`/faculty-tasks/${task.id}/documents/${idx}`);
      toast.success('Removed');
      await onChanged();
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Additional documents{docs.length > 0 ? ` (${docs.length})` : ''}
        </p>
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 disabled:opacity-60"
        >
          <FiUpload size={12} /> {uploading ? 'Uploading…' : 'Add document'}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
      {docs.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No additional documents yet.</p>
      ) : (
        <ul className="space-y-1">
          {docs.map((d, i) => (
            <li key={`${d.url}-${i}`} className="flex items-center gap-2">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-xs text-blue-700 font-medium border border-blue-200 min-w-0"
              >
                <FiPaperclip size={11} className="shrink-0" />
                <span className="truncate">{d.name || 'Document'}</span>
                <FiDownload size={11} className="ml-auto shrink-0" />
              </a>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Remove"
              >
                <FiX size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
