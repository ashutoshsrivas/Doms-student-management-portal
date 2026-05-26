'use client';

// Shared sub-component used by both /admin/faculty-tasks and /faculty/tasks
// to render the extension-request banner (with role-aware actions) and the
// expandable trail/updates thread for a single FacultyTask row.

import { useState, useCallback, useEffect } from 'react';
import {
  FiClock, FiCheck, FiX, FiMessageCircle, FiSend, FiLoader,
  FiAlertTriangle, FiTrash2, FiPlus, FiInfo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/apiClient';

export interface TaskExtensionFields {
  extensionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  extensionRequestedDeadline?: string | null;
  extensionRequestReason?: string | null;
  extensionRequestedAt?: string | null;
  extensionRespondedAt?: string | null;
  extensionResponseReason?: string | null;
  ExtensionResponder?: { firstName: string; lastName: string | null; email: string } | null;
}

export interface TaskExtrasTask extends TaskExtensionFields {
  id: string;
  status: 'PENDING' | 'COMPLETED';
  deadline?: string | null;
}

interface TrailUpdate {
  id: string;
  taskId: string;
  userId: string;
  message: string;
  kind: 'USER' | 'SYSTEM';
  createdAt: string;
  Author?: { id: string; firstName: string; lastName: string | null; email: string; approvedRole?: string };
}

interface Props {
  task: TaskExtrasTask;
  isAdmin: boolean;
  /** Called after any action so the parent can reload the task. */
  onChanged: () => void;
}

const fmtDT = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : '—');

export default function FacultyTaskExtras({ task, isAdmin, onChanged }: Props) {
  // === Extension request (faculty side) ===
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqForm, setReqForm] = useState<{ deadline: string; reason: string }>({ deadline: '', reason: '' });
  const [requesting, setRequesting] = useState(false);

  // === Extension response (admin side) ===
  const [respondingDecision, setRespondingDecision] = useState<null | 'APPROVE' | 'REJECT'>(null);
  const [responseReason, setResponseReason] = useState('');
  const [responding, setResponding] = useState(false);

  // === Trail ===
  const [trailOpen, setTrailOpen] = useState(false);
  const [updates, setUpdates] = useState<TrailUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [posting, setPosting] = useState(false);

  const loadTrail = useCallback(async () => {
    setUpdatesLoading(true);
    try {
      const res = await apiClient.get(`/faculty-tasks/${task.id}/updates`);
      setUpdates(res.data.updates || []);
    } catch {
      toast.error('Failed to load trail');
    } finally {
      setUpdatesLoading(false);
    }
  }, [task.id]);

  useEffect(() => { if (trailOpen) loadTrail(); }, [trailOpen, loadTrail]);

  // === Handlers ===
  const handleRequestExtension = async () => {
    if (!reqForm.deadline) { toast.error('New deadline is required'); return; }
    setRequesting(true);
    try {
      await apiClient.post(`/faculty-tasks/${task.id}/extension`, {
        requestedDeadline: reqForm.deadline,
        reason: reqForm.reason.trim() || null,
      });
      toast.success('Extension request sent to admin');
      setShowRequestForm(false);
      setReqForm({ deadline: '', reason: '' });
      onChanged();
      if (trailOpen) loadTrail();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to request');
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelExtension = async () => {
    if (!confirm('Cancel your pending extension request?')) return;
    try {
      await apiClient.delete(`/faculty-tasks/${task.id}/extension`);
      toast.success('Request cancelled');
      onChanged();
      if (trailOpen) loadTrail();
    } catch { toast.error('Failed to cancel'); }
  };

  const handleRespondExtension = async () => {
    if (!respondingDecision) return;
    setResponding(true);
    try {
      await apiClient.patch(`/faculty-tasks/${task.id}/extension`, {
        decision: respondingDecision,
        responseReason: responseReason.trim() || null,
      });
      toast.success(`Extension ${respondingDecision === 'APPROVE' ? 'approved' : 'rejected'}`);
      setRespondingDecision(null);
      setResponseReason('');
      onChanged();
      if (trailOpen) loadTrail();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to respond');
    } finally {
      setResponding(false);
    }
  };

  const handlePostUpdate = async () => {
    const msg = newMsg.trim();
    if (!msg) return;
    setPosting(true);
    try {
      await apiClient.post(`/faculty-tasks/${task.id}/updates`, { message: msg });
      setNewMsg('');
      loadTrail();
    } catch { toast.error('Failed to post'); }
    finally { setPosting(false); }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!confirm('Delete this update?')) return;
    try {
      await apiClient.delete(`/faculty-tasks/updates/${id}`);
      loadTrail();
    } catch { toast.error('Failed to delete'); }
  };

  // === Render ===
  const ext = task.extensionStatus;

  return (
    <div className="mt-3 space-y-2">
      {/* Extension banner */}
      {ext === 'PENDING' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r p-3">
          <div className="flex items-start gap-2">
            <FiClock className="text-yellow-700 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-bold text-yellow-900">
                {isAdmin ? 'Extension request from faculty' : 'Your extension request is pending'}
              </p>
              <p className="text-yellow-900 mt-0.5">
                Proposed new deadline: <span className="font-semibold">{fmtDT(task.extensionRequestedDeadline)}</span>
              </p>
              {task.extensionRequestReason && (
                <p className="text-yellow-900 mt-1 italic">&quot;{task.extensionRequestReason}&quot;</p>
              )}
              <p className="text-xs text-yellow-700 mt-1">Requested {fmtDT(task.extensionRequestedAt)}</p>
              {/* Actions */}
              {isAdmin ? (
                respondingDecision ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={responseReason}
                      onChange={(e) => setResponseReason(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      placeholder={`Reason for ${respondingDecision === 'APPROVE' ? 'approval' : 'rejection'} (optional)`}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRespondExtension}
                        disabled={responding}
                        className={`px-3 py-1 text-xs font-semibold rounded text-white disabled:opacity-50 ${respondingDecision === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                        {responding ? '…' : `Confirm ${respondingDecision === 'APPROVE' ? 'approve' : 'reject'}`}
                      </button>
                      <button
                        onClick={() => { setRespondingDecision(null); setResponseReason(''); }}
                        className="px-3 py-1 text-xs font-semibold rounded bg-white border border-gray-300 text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setRespondingDecision('APPROVE')}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-green-600 hover:bg-green-700 text-white"
                    >
                      <FiCheck /> Approve
                    </button>
                    <button
                      onClick={() => setRespondingDecision('REJECT')}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white"
                    >
                      <FiX /> Reject
                    </button>
                  </div>
                )
              ) : (
                <div className="mt-2">
                  <button
                    onClick={handleCancelExtension}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-white border border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                  >
                    <FiX /> Cancel request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {ext === 'APPROVED' && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-r p-2.5 flex items-start gap-2">
          <FiCheck className="text-green-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-bold text-green-900">Extension approved</p>
            <p className="text-green-900 text-xs">New deadline applied. Responded {fmtDT(task.extensionRespondedAt)}.</p>
            {task.extensionResponseReason && <p className="text-green-900 text-xs italic mt-0.5">&quot;{task.extensionResponseReason}&quot;</p>}
          </div>
        </div>
      )}

      {ext === 'REJECTED' && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r p-2.5 flex items-start gap-2">
          <FiAlertTriangle className="text-red-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-bold text-red-900">Extension rejected</p>
            <p className="text-red-900 text-xs">Responded {fmtDT(task.extensionRespondedAt)}.</p>
            {task.extensionResponseReason && <p className="text-red-900 text-xs italic mt-0.5">&quot;{task.extensionResponseReason}&quot;</p>}
          </div>
        </div>
      )}

      {/* Faculty: Request extension button (when no pending) */}
      {!isAdmin && task.status === 'PENDING' && ext !== 'PENDING' && (
        showRequestForm ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded p-3 space-y-2">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Request deadline extension</p>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">New deadline *</label>
              <input
                type="datetime-local"
                value={reqForm.deadline}
                onChange={(e) => setReqForm((p) => ({ ...p, deadline: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={reqForm.reason}
                onChange={(e) => setReqForm((p) => ({ ...p, reason: e.target.value }))}
                rows={2}
                maxLength={2000}
                placeholder="Why do you need more time?"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRequestExtension}
                disabled={requesting || !reqForm.deadline}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white"
              >
                <FiSend /> {requesting ? 'Sending…' : 'Send request'}
              </button>
              <button
                onClick={() => { setShowRequestForm(false); setReqForm({ deadline: '', reason: '' }); }}
                className="px-3 py-1 text-xs font-semibold rounded bg-white border border-gray-300 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowRequestForm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            <FiClock size={12} /> Request deadline extension
          </button>
        )
      )}

      {/* Trail toggle + thread */}
      <div>
        <button
          onClick={() => setTrailOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <FiMessageCircle size={12} /> {trailOpen ? 'Hide trail' : 'Show trail'}
        </button>
        {trailOpen && (
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3">
            {updatesLoading ? (
              <p className="text-xs text-gray-500 flex items-center gap-1"><FiLoader className="animate-spin" /> Loading…</p>
            ) : updates.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No updates yet — be the first to post.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {updates.map((u) => (
                  <li key={u.id} className={`text-sm rounded p-2 ${u.kind === 'SYSTEM' ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {u.kind === 'SYSTEM' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                              <FiInfo size={9} /> system
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              {u.Author ? `${u.Author.firstName} ${u.Author.lastName || ''}` : 'Unknown'}
                            </span>
                          )}
                          {u.Author?.approvedRole && u.kind === 'USER' && (
                            <span className="text-[10px] uppercase text-gray-500 font-semibold">{u.Author.approvedRole}</span>
                          )}
                          <span className="text-[11px] text-gray-500">· {fmtDT(u.createdAt)}</span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap mt-0.5 ${u.kind === 'SYSTEM' ? 'text-indigo-900' : 'text-gray-800'}`}>{u.message}</p>
                      </div>
                      {u.kind === 'USER' && (isAdmin || u.Author) && (
                        <button
                          onClick={() => handleDeleteUpdate(u.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded shrink-0"
                          title="Delete"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-stretch gap-2">
              <textarea
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Post an update…"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
              />
              <button
                onClick={handlePostUpdate}
                disabled={posting || !newMsg.trim()}
                className="px-3 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-xs font-semibold rounded flex items-center gap-1"
              >
                <FiPlus size={12} /> Post
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
