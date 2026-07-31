'use client';

// Renders every actionable notification the student still owes a
// response to. Supports ACK (one-click), TEXT (short answer), and
// CHOICE (single-select). Once responded, the card drops out of the
// list on next refetch.

import { useEffect, useState, useCallback } from 'react';
import { FiBell, FiCheckCircle, FiPaperclip, FiUpload, FiChevronDown, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/apiClient';
import FilePreview from './FilePreview';

type PromptType = 'ACK' | 'TEXT' | 'CHOICE' | 'FILE';

interface Prompt {
  id: string;
  title: string;
  body?: string | null;
  promptType: PromptType;
  options?: string[] | null;
  deadline?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  Session?: { id: string; name: string } | null;
  Creator?: { firstName: string | null; lastName: string | null } | null;
  createdAt: string;
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

interface HistoryPrompt extends Prompt {
  myResponse?: {
    responseText: string | null;
    responseChoice: string | null;
    responseFileUrl: string | null;
    responseFileName: string | null;
    respondedAt: string;
  };
  status?: 'ACTIVE' | 'ARCHIVED';
}

export default function StudentNotificationPrompts() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Completed history state — kept out of the noisy pending list.
  const [history, setHistory] = useState<HistoryPrompt[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/notification-prompts/mine');
      setPrompts(data.prompts || []);
    } catch {
      setPrompts([]);
    }
  }, []);
  const loadHistory = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/notification-prompts/mine/history');
      setHistory(data.prompts || []);
    } catch {
      setHistory([]);
    }
  }, []);
  useEffect(() => {
    load();
    loadHistory();
  }, [load, loadHistory]);

  const respond = async (
    p: Prompt,
    payload: { text?: string; choice?: string; file?: File },
  ) => {
    setSaving(p.id);
    try {
      let body: FormData | Record<string, unknown> = payload;
      let headers: Record<string, string> | undefined;
      if (payload.file) {
        const fd = new FormData();
        if (payload.text) fd.append('text', payload.text);
        if (payload.choice) fd.append('choice', payload.choice);
        fd.append('file', payload.file);
        body = fd;
        headers = { 'Content-Type': 'multipart/form-data' };
      }
      await apiClient.post(`/notification-prompts/${p.id}/respond`, body, headers ? { headers } : undefined);
      toast.success('Response recorded');
      await Promise.all([load(), loadHistory()]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(null);
    }
  };

  const pending = prompts || [];
  const done = history || [];
  if (pending.length === 0 && done.length === 0) return null;

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-indigo-200 bg-indigo-100/60">
          <FiBell className="w-5 h-5 text-indigo-700" />
          <h2 className="font-semibold text-indigo-900">
            Notifications requiring your response ({pending.length})
          </h2>
        </div>
        <ul className="divide-y divide-indigo-100">
          {pending.map((p) => (
            <li key={p.id} className="p-4 bg-white">
              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">{p.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800">
                  {p.promptType === 'ACK' ? 'Acknowledge'
                    : p.promptType === 'TEXT' ? 'Answer'
                    : p.promptType === 'CHOICE' ? 'Pick one'
                    : 'Upload file'}
                </span>
                {p.deadline && (
                  <span className="text-[11px] text-orange-700 font-medium">
                    Due {fmtDate(p.deadline)}
                  </span>
                )}
              </div>
              {p.body && <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{p.body}</p>}
              {p.attachmentUrl && (
                <div className="mb-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                    <FiPaperclip size={11} /> Attachment
                  </div>
                  <FilePreview
                    url={p.attachmentUrl}
                    name={p.attachmentName}
                    mime={p.attachmentMime}
                    className="max-w-md"
                  />
                </div>
              )}
              {p.promptType === 'ACK' && (
                <button
                  disabled={saving === p.id}
                  onClick={() => respond(p, {})}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  <FiCheckCircle className="w-4 h-4" /> {saving === p.id ? 'Saving…' : 'I acknowledge'}
                </button>
              )}
              {p.promptType === 'TEXT' && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={drafts[p.id] || ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      placeholder="Your answer"
                      maxLength={4000}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      disabled={saving === p.id || !(drafts[p.id] || '').trim()}
                      onClick={() => respond(p, { text: drafts[p.id], file: files[p.id] || undefined })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                    >
                      {saving === p.id ? 'Saving…' : 'Submit'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <label className="inline-flex items-center gap-1 text-blue-700 hover:underline cursor-pointer">
                      <FiPaperclip size={11} /> Attach a file (optional)
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setFiles((f) => ({ ...f, [p.id]: e.target.files?.[0] || null }))}
                      />
                    </label>
                    {files[p.id] && (
                      <span className="text-gray-700">
                        {files[p.id]!.name}
                        <button
                          type="button"
                          onClick={() => setFiles((f) => ({ ...f, [p.id]: null }))}
                          className="ml-2 text-red-600 hover:underline"
                        >remove</button>
                      </span>
                    )}
                  </div>
                </div>
              )}
              {p.promptType === 'CHOICE' && (
                <div className="flex flex-wrap gap-2">
                  {(p.options || []).map((opt) => (
                    <button
                      key={opt}
                      disabled={saving === p.id}
                      onClick={() => respond(p, { choice: opt })}
                      className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-blue-300 text-blue-800 bg-white hover:bg-blue-50 disabled:opacity-60"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {p.promptType === 'FILE' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <FiUpload size={13} /> {files[p.id]?.name || 'Choose file'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setFiles((f) => ({ ...f, [p.id]: e.target.files?.[0] || null }))}
                    />
                  </label>
                  <button
                    disabled={saving === p.id || !files[p.id]}
                    onClick={() => respond(p, { file: files[p.id]! })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <FiCheckCircle size={13} /> {saving === p.id ? 'Uploading…' : 'Upload & submit'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      )}

      {/* Completed history — collapsed by default, always shows the count. */}
      {done.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FiCheckCircle className="w-4 h-4 text-emerald-600" />
              Completed notifications ({done.length})
            </span>
            <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
          </button>
          {historyOpen && (
            <ul className="divide-y divide-gray-100 border-t border-gray-200">
              {done.map((p) => (
                <li key={p.id} className="p-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-900">{p.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">
                      {p.promptType === 'ACK' ? 'Acknowledged'
                        : p.promptType === 'TEXT' ? 'Answer'
                        : p.promptType === 'CHOICE' ? 'Choice'
                        : 'File'}
                    </span>
                    {p.status === 'ARCHIVED' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-gray-200 text-gray-700">Closed</span>
                    )}
                  </div>
                  {p.body && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{p.body}</p>}
                  {p.attachmentUrl && (
                    <div className="mt-2 max-w-md">
                      <FilePreview url={p.attachmentUrl} name={p.attachmentName} mime={p.attachmentMime} />
                    </div>
                  )}
                  {p.myResponse && (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
                      <div className="text-[11px] uppercase font-semibold text-emerald-800 mb-0.5 flex items-center gap-1">
                        <FiCheckCircle size={11} /> Your response
                        <span className="text-emerald-700/70 font-normal">
                          <FiClock className="inline w-2.5 h-2.5 mr-0.5" />
                          {fmtDate(p.myResponse.respondedAt)}
                        </span>
                      </div>
                      {p.promptType === 'ACK' && <div className="text-emerald-900 font-medium">Acknowledged.</div>}
                      {p.promptType === 'TEXT' && p.myResponse.responseText && (
                        <div className="text-gray-800 whitespace-pre-wrap">{p.myResponse.responseText}</div>
                      )}
                      {p.promptType === 'CHOICE' && p.myResponse.responseChoice && (
                        <div className="text-gray-800">Chose: <b>{p.myResponse.responseChoice}</b></div>
                      )}
                      {p.myResponse.responseFileUrl && (
                        <div className="mt-1.5 max-w-xs">
                          <FilePreview url={p.myResponse.responseFileUrl} name={p.myResponse.responseFileName} />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
