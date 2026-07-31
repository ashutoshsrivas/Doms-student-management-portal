'use client';

// Renders every actionable notification the student still owes a
// response to. Supports ACK (one-click), TEXT (short answer), and
// CHOICE (single-select). Once responded, the card drops out of the
// list on next refetch.

import { useEffect, useState, useCallback } from 'react';
import { FiBell, FiCheckCircle, FiPaperclip, FiDownload, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/apiClient';

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
  Session?: { id: string; name: string } | null;
  Creator?: { firstName: string | null; lastName: string | null } | null;
  createdAt: string;
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function StudentNotificationPrompts() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/notification-prompts/mine');
      setPrompts(data.prompts || []);
    } catch {
      setPrompts([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

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
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(null);
    }
  };

  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-4 mt-4">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-indigo-200 bg-indigo-100/60">
          <FiBell className="w-5 h-5 text-indigo-700" />
          <h2 className="font-semibold text-indigo-900">
            Notifications requiring your response ({prompts.length})
          </h2>
        </div>
        <ul className="divide-y divide-indigo-100">
          {prompts.map((p) => (
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
                <a
                  href={p.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mb-2 text-xs text-blue-700 hover:underline"
                >
                  <FiPaperclip size={11} /> {p.attachmentName || 'Attachment'}
                  <FiDownload size={11} />
                </a>
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
    </div>
  );
}
