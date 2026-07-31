'use client';

// Admin-side actionable notifications. Create a prompt (Acknowledge /
// Text answer / Multiple choice) targeting a session or all students,
// and see live response counts + per-student answers.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiBell, FiPlus, FiTrash2, FiRefreshCw, FiCheckCircle, FiClock, FiChevronDown, FiX,
  FiUsers, FiArchive, FiRotateCcw, FiPaperclip, FiDownload,
} from 'react-icons/fi';
import FilePreview from '@/app/components/FilePreview';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

type PromptType = 'ACK' | 'TEXT' | 'CHOICE' | 'FILE';

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
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
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
  responseFileUrl?: string | null;
  responseFileName?: string | null;
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
  FILE: { label: 'File upload', chip: 'bg-amber-100 text-amber-800' },
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
  const [attachment, setAttachment] = useState<File | null>(null);

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
    setAttachment(null);
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
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.body) fd.append('body', form.body);
      fd.append('promptType', form.promptType);
      if (form.promptType === 'CHOICE') {
        const opts = form.options.map((o) => o.trim()).filter(Boolean);
        for (const o of opts) fd.append('options', o);
      }
      if (form.sessionId) fd.append('sessionId', form.sessionId);
      if (form.deadline) fd.append('deadline', form.deadline);
      if (attachment) fd.append('attachment', attachment);
      await apiClient.post('/notification-prompts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
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

  // Download full responded + pending list as a CSV. Uses the
  // detail endpoint so we always get fresh data (even when the
  // panel is collapsed).
  const downloadCsv = async (p: Prompt) => {
    const toastId = toast.loading('Building CSV…');
    try {
      let detail: ResponseDetail | null = null;
      if (expanded[p.id] && expanded[p.id] !== 'loading') {
        detail = expanded[p.id] as ResponseDetail;
      } else {
        const { data } = await apiClient.get(`/notification-prompts/${p.id}/responses`);
        detail = data as ResponseDetail;
      }
      if (!detail) throw new Error('No data');

      const header = [
        'Name', 'Email', 'Registration No.', 'Status',
        'Response Type', 'Response', 'File', 'Responded At',
      ];
      const cellEscape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows: string[][] = [];
      for (const r of detail.responses) {
        const s = r.Student;
        const name = s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : '';
        const answer = p.promptType === 'CHOICE' ? (r.responseChoice || '')
          : p.promptType === 'TEXT' ? (r.responseText || '')
          : p.promptType === 'FILE' ? (r.responseFileName || '(file)')
          : 'Acknowledged';
        rows.push([
          name, s?.email || '', s?.registrationNumber || '', 'Responded',
          p.promptType, answer, r.responseFileUrl || '',
          new Date(r.respondedAt).toLocaleString(),
        ]);
      }
      for (const s of detail.pendingStudents) {
        const name = `${s.firstName || ''} ${s.lastName || ''}`.trim();
        rows.push([name, s.email || '', s.registrationNumber || '', 'Pending', p.promptType, '', '', '']);
      }
      const csv = [header, ...rows].map((r) => r.map(cellEscape).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const slug = p.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 60) || 'notification';
      a.download = `${slug}_responses.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(
        `Downloaded — ${detail.responses.length} responded, ${detail.pendingStudents.length} pending`,
        { id: toastId },
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to download', { id: toastId });
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
                        {p.attachmentUrl && (
                          <div className="mt-2 max-w-md">
                            <FilePreview
                              url={p.attachmentUrl}
                              name={p.attachmentName}
                              mime={p.attachmentMime}
                            />
                          </div>
                        )}
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
                          onClick={() => downloadCsv(p)}
                          className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          title="Download responded + pending list as CSV"
                        >
                          <FiDownload className="w-4 h-4" />
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
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['ACK', 'TEXT', 'CHOICE', 'FILE'] as PromptType[]).map((t) => (
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
                  {form.promptType === 'TEXT' && 'Student types a short answer (and can optionally attach a file).'}
                  {form.promptType === 'CHOICE' && 'Student picks one of the options you provide.'}
                  {form.promptType === 'FILE' && 'Student must upload a file to complete this notification.'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase">Attachment (optional)</label>
                <input
                  type="file"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {attachment && (
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-600">
                    <FiPaperclip size={11} /> {attachment.name}
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-red-600 hover:underline"
                    >Remove</button>
                  </div>
                )}
                <p className="text-[11px] text-gray-500 mt-0.5">Students see this as a downloadable link on the prompt.</p>
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
                  {r.responseFileUrl && (
                    <div className="mt-2 max-w-xs">
                      <FilePreview
                        url={r.responseFileUrl}
                        name={r.responseFileName}
                      />
                    </div>
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
