'use client';

// Admin-side actionable notifications. Create a prompt (Acknowledge /
// Text answer / Multiple choice) targeting a session or all students,
// and see live response counts + per-student answers.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiBell, FiPlus, FiTrash2, FiRefreshCw, FiCheckCircle, FiClock, FiChevronDown, FiX,
  FiUsers, FiArchive, FiRotateCcw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

type PromptType = 'ACK' | 'TEXT' | 'CHOICE';

interface AcademicSessionLite {
  id: string;
  name: string;
  isActive?: boolean;
}

interface UserLite {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  registrationNumber?: string | null;
}

interface Prompt {
  id: string;
  title: string;
  body?: string | null;
  promptType: PromptType;
  options?: string[] | null;
  deadline?: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  sessionId: string | null;
  Session?: AcademicSessionLite | null;
  Creator?: UserLite | null;
  eligible: number;
  responded: number;
  pending: number;
}

interface ResponseRow {
  id: string;
  studentUserId: string;
  responseText: string | null;
  responseChoice: string | null;
  respondedAt: string;
  Student: UserLite | null;
}

interface ResponseDetail {
  prompt: Prompt;
  responses: ResponseRow[];
  pendingStudents: UserLite[];
  totals: { eligible: number; responded: number; pending: number };
}

const TYPE_META: Record<PromptType, { label: string; chip: string }> = {
  ACK: { label: 'Acknowledge', chip: 'bg-blue-100 text-blue-800' },
  TEXT: { label: 'Text answer', chip: 'bg-emerald-100 text-emerald-800' },
  CHOICE: { label: 'Choice', chip: 'bg-purple-100 text-purple-800' },
};

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : '—');
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [sessions, setSessions] = useState<AcademicSessionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [expanded, setExpanded] = useState<Record<string, ResponseDetail | 'loading' | null>>({});

  const [form, setForm] = useState<{
    title: string; body: string;
    promptType: PromptType; options: string[];
    sessionId: string; deadline: string;
  }>({
    title: '',
    body: '',
    promptType: 'ACK',
    options: ['', ''],
    sessionId: '',
    deadline: '',
  });

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HOD';

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) { router.push('/dashboard'); return; }
    load();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/notification-prompts');
      setPrompts(data.prompts || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = async () => {
    try {
      const { data } = await apiClient.get('/sessions?limit=100');
      setSessions(data.sessions || []);
    } catch { /* silent */ }
  };

  const resetForm = () => {
    setForm({ title: '', body: '', promptType: 'ACK', options: ['', ''], sessionId: '', deadline: '' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (form.promptType === 'CHOICE') {
      const opts = form.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) { toast.error('Choice needs at least 2 options'); return; }
    }
    setCreating(true);
    try {
      await apiClient.post('/notification-prompts', {
        title: form.title,
        body: form.body || null,
        promptType: form.promptType,
        options: form.promptType === 'CHOICE' ? form.options.map((o) => o.trim()).filter(Boolean) : null,
        sessionId: form.sessionId || null,
        deadline: form.deadline || null,
      });
      toast.success('Notification published');
      resetForm();
      setShowCreate(false);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setCreating(false);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expanded[id] && expanded[id] !== 'loading') {
      setExpanded((p) => ({ ...p, [id]: null }));
      return;
    }
    setExpanded((p) => ({ ...p, [id]: 'loading' }));
    try {
      const { data } = await apiClient.get(`/notification-prompts/${id}/responses`);
      setExpanded((p) => ({ ...p, [id]: data as ResponseDetail }));
    } catch {
      toast.error('Failed to load responses');
      setExpanded((p) => ({ ...p, [id]: null }));
    }
  };

  const remove = async (p: Prompt) => {
    if (!confirm(`Delete notification "${p.title}"? All responses will be removed.`)) return;
    try {
      await apiClient.delete(`/notification-prompts/${p.id}`);
      toast.success('Deleted');
      await load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const archive = async (p: Prompt) => {
    try {
      const un = p.status === 'ARCHIVED' ? '?unarchive=1' : '';
      await apiClient.patch(`/notification-prompts/${p.id}/archive${un}`);
      toast.success(p.status === 'ARCHIVED' ? 'Reopened' : 'Archived');
      await load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = prompts.filter((p) => statusFilter === 'ALL' || p.status === statusFilter);

  if (!user || !isAdmin) {
    return <DashboardLayout><div className="p-6 text-gray-500">Loading…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <FiBell className="w-6 h-6 text-blue-600" /> Actionable Notifications
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Send prompts to students that require an acknowledgement, a written answer, or a choice — and track who has responded.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700">
              <FiPlus className="w-4 h-4" /> New notification
            </button>
          </div>
        </div>

        {/* Status filter */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-gray-500">Status:</span>
          {(['ACTIVE', 'ARCHIVED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">No notifications match.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const detail = expanded[p.id];
                const isOpen = !!detail && detail !== 'loading';
                return (
                  <li key={p.id}>
                    <div className="px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{p.title}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${TYPE_META[p.promptType].chip}`}>
                            {TYPE_META[p.promptType].label}
                          </span>
                          {p.status === 'ARCHIVED' && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold">Archived</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {p.Session ? p.Session.name : 'All sessions'}
                          {' · '}
                          Created {fmtDate(p.createdAt)}
                          {p.deadline && <> · Due {fmtDate(p.deadline)}</>}
                        </div>
                        {p.body && <p className="text-sm text-gray-700 mt-1 line-clamp-2 whitespace-pre-wrap">{p.body}</p>}
                        <div className="mt-2 flex items-center gap-4 text-xs">
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <FiCheckCircle size={11} /> {p.responded} responded
                          </span>
                          <span className="inline-flex items-center gap-1 text-orange-700">
                            <FiClock size={11} /> {p.pending} pending
                          </span>
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <FiUsers size={11} /> {p.eligible} eligible
                          </span>
                          <span className="text-gray-500">{pct(p.responded, p.eligible)}% coverage</span>
                        </div>
                        {/* Response detail panel */}
                        {detail === 'loading' && <p className="mt-2 text-xs text-gray-500">Loading responses…</p>}
                        {isOpen && (
                          <ResponsePanel detail={detail as ResponseDetail} />
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title={isOpen ? 'Collapse' : 'View responses'}
                        >
                          <FiChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                          onClick={() => archive(p)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title={p.status === 'ARCHIVED' ? 'Reopen' : 'Archive'}
                        >
                          {p.status === 'ARCHIVED' ? <FiRotateCcw className="w-4 h-4" /> : <FiArchive className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FiPlus className="w-4 h-4" /> New notification
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><FiX /></button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Confirm consent for internship data sharing"
                  maxLength={250}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase">Body (optional)</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Explain what the student is agreeing to or answering."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Target session</label>
                  <select
                    value={form.sessionId}
                    onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All sessions</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (active)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Deadline (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase">Response type</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['ACK', 'TEXT', 'CHOICE'] as PromptType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, promptType: t }))}
                      className={`px-2 py-1.5 text-xs font-semibold rounded border ${form.promptType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {form.promptType === 'ACK' && 'Student clicks "I acknowledge" to record their response.'}
                  {form.promptType === 'TEXT' && 'Student types a short answer.'}
                  {form.promptType === 'CHOICE' && 'Student picks one of the options you provide.'}
                </p>
              </div>
              {form.promptType === 'CHOICE' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Options</label>
                  <div className="mt-1 space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => setForm((f) => {
                            const next = [...f.options];
                            next[i] = e.target.value;
                            return { ...f, options: next };
                          })}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder={`Option ${i + 1}`}
                          maxLength={120}
                        />
                        {form.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          >
                            <FiX />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}
                      className="text-xs text-blue-700 font-semibold hover:underline"
                    >
                      + Add option
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating} className="px-3 py-1.5 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
                  {creating ? 'Publishing…' : 'Publish notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ResponsePanel({ detail }: { detail: ResponseDetail }) {
  const { responses, pendingStudents, prompt } = detail;
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Responded */}
        <div>
          <div className="text-[11px] uppercase font-semibold text-emerald-700 mb-1.5">
            Responded ({responses.length})
          </div>
          {responses.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No one yet.</p>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {responses.map((r) => (
                <li key={r.id} className="bg-white border border-gray-200 rounded px-2 py-1.5 text-xs">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-gray-900">
                      {r.Student ? `${r.Student.firstName || ''} ${r.Student.lastName || ''}`.trim() : 'Unknown'}
                    </span>
                    <span className="text-gray-500 text-[10px]">{fmtDate(r.respondedAt)}</span>
                  </div>
                  {prompt.promptType === 'CHOICE' && r.responseChoice && (
                    <div className="mt-0.5 text-gray-700">
                      Chose: <b>{r.responseChoice}</b>
                    </div>
                  )}
                  {prompt.promptType === 'TEXT' && r.responseText && (
                    <div className="mt-0.5 text-gray-700 whitespace-pre-wrap">{r.responseText}</div>
                  )}
                  {prompt.promptType === 'ACK' && (
                    <div className="mt-0.5 text-emerald-700 font-medium">Acknowledged</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Pending */}
        <div>
          <div className="text-[11px] uppercase font-semibold text-orange-700 mb-1.5">
            Still pending ({pendingStudents.length})
          </div>
          {pendingStudents.length === 0 ? (
            <p className="text-xs text-emerald-700 font-medium">Everyone responded 🎉</p>
          ) : (
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {pendingStudents.map((s) => (
                <li key={s.id} className="bg-white border border-gray-200 rounded px-2 py-1 text-xs">
                  <div className="font-medium text-gray-900">
                    {`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email}
                  </div>
                  <div className="text-[10px] text-gray-500">{s.email}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
