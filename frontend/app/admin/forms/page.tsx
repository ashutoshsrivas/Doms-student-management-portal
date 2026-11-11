'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiPlus, FiClipboard, FiLink, FiBarChart2, FiEdit2, FiTrash2, FiGlobe, FiLock,
  FiMapPin, FiSmartphone, FiLoader, FiExternalLink, FiCheck, FiX,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { FormSummary, fmtDateTime } from '@/app/lib/forms';

const ADMIN_ROLES = ['ADMIN', 'HOD', 'COORDINATOR'];

const STATUS_CHIP: Record<FormSummary['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700 ring-gray-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  CLOSED: 'bg-rose-100 text-rose-800 ring-rose-200',
};

const publicUrl = (slug: string) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/f/${slug}`;

function Content() {
  const router = useRouter();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/forms');
      setForms(res.data.forms || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not load the forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) { toast.error('Give the form a title'); return; }
    try {
      setSaving(true);
      const res = await apiClient.post('/forms', { title: title.trim(), audience });
      toast.success('Form created');
      router.push(`/admin/forms/${res.data.form.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not create the form');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (slug: string) => {
    const url = publicUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      toast.success('Link copied');
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
    } catch {
      // Clipboard access can be refused; show the link so it can be copied by hand.
      toast.error(url);
    }
  };

  const setStatus = async (form: FormSummary, status: FormSummary['status']) => {
    try {
      const res = await apiClient.patch(`/forms/${form.id}/status`, { status });
      toast.success(res.data.message);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not change the status');
    }
  };

  const remove = async (form: FormSummary, confirmed = false) => {
    if (!confirmed && !window.confirm(`Delete “${form.title}”?`)) return;
    try {
      await apiClient.delete(`/forms/${form.id}${confirmed ? '?confirm=1' : ''}`);
      toast.success('Form deleted');
      load();
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string; needsConfirm?: boolean } } };
      if (err.response?.data?.needsConfirm) {
        if (window.confirm(`${err.response.data.message}\n\nDelete anyway?`)) remove(form, true);
        return;
      }
      toast.error(err.response?.data?.message || 'Could not delete the form');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Forms</h1>
          <p className="mt-1 text-sm text-gray-500">
            Build a form, publish it, and collect responses — with or without a portal login.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <FiPlus className="h-4 w-4" /> New form
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-gray-500">
          <FiLoader className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : !forms.length ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <FiClipboard className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-gray-900">No forms yet</p>
          <p className="mt-1 text-sm text-gray-500">Create one, add your questions, then publish to get a shareable link.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {forms.map((f) => (
            <div key={f.id} className="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_CHIP[f.status]}`}>
                  {f.status.toLowerCase()}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                  {f.audience === 'PUBLIC'
                    ? <><FiGlobe className="h-3 w-3" /> Public</>
                    : <><FiLock className="h-3 w-3" /> Login required</>}
                </span>
              </div>

              <Link href={`/admin/forms/${f.id}`} className="mt-3 min-w-0">
                <h2 className="truncate font-bold text-gray-900 hover:text-indigo-700">{f.title}</h2>
              </Link>
              {f.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{f.description}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                <span>{f.fields.length} question{f.fields.length === 1 ? '' : 's'}</span>
                <span className="font-semibold text-gray-700">{f.responseCount ?? 0} response{(f.responseCount ?? 0) === 1 ? '' : 's'}</span>
                {f.collectLocation && <span className="inline-flex items-center gap-1 text-blue-600"><FiMapPin className="h-3 w-3" /> location</span>}
                {f.collectDevice && <span className="inline-flex items-center gap-1 text-violet-600"><FiSmartphone className="h-3 w-3" /> device</span>}
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                {f.createdByName ? `${f.createdByName} · ` : ''}{fmtDateTime(f.createdAt)}
              </p>

              {f.status === 'PUBLISHED' && (
                <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-gray-50 px-2.5 py-2">
                  <code className="min-w-0 flex-1 truncate text-[11px] text-gray-600">/f/{f.slug}</code>
                  <button
                    type="button"
                    onClick={() => copyLink(f.slug)}
                    title="Copy the public link"
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900"
                  >
                    {copied === f.slug ? <FiCheck className="h-3.5 w-3.5 text-emerald-600" /> : <FiLink className="h-3.5 w-3.5" />}
                  </button>
                  <a
                    href={`/f/${f.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Open the form"
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900"
                  >
                    <FiExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                <Link
                  href={`/admin/forms/${f.id}/responses`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <FiBarChart2 className="h-3.5 w-3.5" /> Responses
                </Link>
                <Link
                  href={`/admin/forms/${f.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FiEdit2 className="h-3.5 w-3.5" /> Edit
                </Link>
                {f.status === 'PUBLISHED' ? (
                  <button
                    type="button"
                    onClick={() => setStatus(f, 'CLOSED')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <FiX className="h-3.5 w-3.5" /> Close
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus(f, 'PUBLISHED')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <FiCheck className="h-3.5 w-3.5" /> {f.status === 'CLOSED' ? 'Reopen' : 'Publish'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(f)}
                  title="Delete the form"
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full min-w-0 max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <h2 className="text-lg font-bold text-gray-900">New form</h2>
            <p className="mt-1 text-sm text-gray-500">You can change everything else in the builder.</p>

            <label className="mt-5 mb-1.5 block text-sm font-semibold text-gray-900">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Industry visit feedback"
              className="w-full min-w-0 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            <p className="mt-5 mb-2 text-sm font-semibold text-gray-900">Who can fill it?</p>
            <div className="space-y-2">
              {([
                { value: 'PRIVATE', icon: <FiLock className="h-4 w-4" />, title: 'Private — login required', note: 'Only portal accounts. Name, registration number and session are filled in automatically.' },
                { value: 'PUBLIC', icon: <FiGlobe className="h-4 w-4" />, title: 'Public — no login', note: 'Anyone with the link can answer. Good for outsiders and guests.' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    audience === opt.value ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-100' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg ${audience === opt.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {opt.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{opt.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{opt.note}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setCreating(false); setTitle(''); }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={create}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {saving ? <><FiLoader className="h-4 w-4 animate-spin" /> Creating…</> : 'Create and add questions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormsPage() {
  return (
    <ProtectedRoute requiredRoles={ADMIN_ROLES}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
