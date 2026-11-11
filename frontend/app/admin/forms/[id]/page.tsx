'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiSave, FiLoader, FiArrowLeft,
  FiMapPin, FiSmartphone, FiGlobe, FiLock, FiLink, FiExternalLink, FiCheck,
  FiBarChart2, FiEye, FiAlertCircle, FiCopy,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { FieldType, FormField, FormSummary, FIELD_TYPE_LABELS, isChoice } from '@/app/lib/forms';

const ADMIN_ROLES = ['ADMIN', 'HOD', 'COORDINATOR'];
const newId = () => Math.random().toString(36).slice(2, 10);
const input = 'w-full min-w-0 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

// A date-time the <input type="datetime-local"> will accept.
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Declared outside the component on purpose: re-creating it during render
// makes React remount the switch on every keystroke elsewhere on the page.
const Toggle = ({ on, onChange, label, note, icon, disabled }: {
  on: boolean; onChange: (v: boolean) => void; label: string; note: string;
  icon?: React.ReactNode; disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
      on ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'
    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
  >
    {icon && (
      <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg ${on ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-gray-900">{label}</span>
      <span className="mt-0.5 block text-xs text-gray-500">{note}</span>
    </span>
    <span className={`mt-1 h-5 w-9 flex-none rounded-full p-0.5 transition ${on ? 'bg-indigo-600' : 'bg-gray-300'}`}>
      <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? 'translate-x-4' : ''}`} />
    </span>
  </button>
);

function Content() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const router = useRouter();

  const [form, setForm] = useState<FormSummary | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/forms/${id}`);
      setForm(res.data.form);
      setFields(res.data.form.fields || []);
      setDirty(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not load the form');
      router.push('/admin/forms');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const patch = (changes: Partial<FormSummary>) => {
    setForm((f) => (f ? { ...f, ...changes } : f));
    setDirty(true);
  };

  const patchField = (fieldId: string, changes: Partial<FormField>) => {
    setFields((list) => list.map((f) => (f.id === fieldId ? { ...f, ...changes } : f)));
    setDirty(true);
  };

  const addField = () => {
    setFields((list) => [...list, { id: newId(), label: '', type: 'short_text', required: false }]);
    setDirty(true);
  };

  const duplicateField = (index: number) => {
    setFields((list) => {
      const copy = { ...list[index], id: newId(), label: `${list[index].label} (copy)` };
      return [...list.slice(0, index + 1), copy, ...list.slice(index + 1)];
    });
    setDirty(true);
  };

  const removeField = (fieldId: string) => {
    setFields((list) => list.filter((f) => f.id !== fieldId));
    setDirty(true);
  };

  const move = (index: number, by: -1 | 1) => {
    setFields((list) => {
      const next = [...list];
      const target = index + by;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const changeType = (field: FormField, type: FieldType) => {
    const changes: Partial<FormField> = { type };
    // A choice question needs somewhere to put the options.
    if (isChoice(type) && !(field.options || []).length) changes.options = ['Option 1'];
    if (!isChoice(type)) changes.options = undefined;
    patchField(field.id, changes);
  };

  const save = async () => {
    if (!form) return;
    try {
      setSaving(true);
      const res = await apiClient.put(`/forms/${form.id}`, {
        title: form.title,
        description: form.description,
        audience: form.audience,
        collectLocation: form.collectLocation,
        collectDevice: form.collectDevice,
        locationRequired: form.locationRequired,
        oneResponsePerUser: form.oneResponsePerUser,
        closesAt: form.closesAt,
        fields,
      });
      setForm(res.data.form);
      setFields(res.data.form.fields || []);
      setDirty(false);
      toast.success(res.data.message);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not save the form');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: FormSummary['status']) => {
    if (!form) return;
    if (dirty) { toast.error('Save your changes first'); return; }
    try {
      const res = await apiClient.patch(`/forms/${form.id}/status`, { status });
      toast.success(res.data.message);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not change the status');
    }
  };

  const copyLink = async () => {
    if (!form) return;
    const url = `${window.location.origin}/f/${form.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(url);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-gray-500">
        <FiLoader className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const locked = (form.responseCount ?? 0) > 0;

  return (
    <div className="w-full min-w-0 space-y-5 pb-24">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/forms" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900">
            <FiArrowLeft className="h-3.5 w-3.5" /> All forms
          </Link>
          <h1 className="mt-1.5 truncate text-xl font-bold text-gray-900 sm:text-2xl">{form.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="font-semibold uppercase tracking-wide">{form.status.toLowerCase()}</span>
            <span className="inline-flex items-center gap-1">
              {form.audience === 'PUBLIC' ? <><FiGlobe className="h-3 w-3" /> public</> : <><FiLock className="h-3 w-3" /> login required</>}
            </span>
            <span>{form.responseCount ?? 0} response{(form.responseCount ?? 0) === 1 ? '' : 's'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/forms/${form.id}/responses`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FiBarChart2 className="h-4 w-4" /> Responses
          </Link>
          <a
            href={`/f/${form.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FiEye className="h-4 w-4" /> Preview
          </a>
          {form.status === 'PUBLISHED' ? (
            <button type="button" onClick={() => setStatus('CLOSED')} className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Close
            </button>
          ) : (
            <button type="button" onClick={() => setStatus('PUBLISHED')} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              {form.status === 'CLOSED' ? 'Reopen' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {/* the live link */}
      {form.status === 'PUBLISHED' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <FiLink className="h-4 w-4 flex-none text-emerald-700" />
          <code className="min-w-0 flex-1 truncate text-xs text-emerald-900">{typeof window !== 'undefined' ? `${window.location.origin}/f/${form.slug}` : `/f/${form.slug}`}</code>
          <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
            {copied ? <><FiCheck className="h-3.5 w-3.5" /> Copied</> : <><FiLink className="h-3.5 w-3.5" /> Copy link</>}
          </button>
          <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
            <FiExternalLink className="h-3.5 w-3.5" /> Open
          </a>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* questions */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">Title</label>
            <input className={input} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-gray-900">Description <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} className={input} value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Shown to the responder above the first question" />
          </div>

          {fields.map((f, i) => (
            <div key={f.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="mt-2.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-3">
                  <input
                    className={input}
                    placeholder="Question"
                    value={f.label}
                    onChange={(e) => patchField(f.id, { label: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-400"
                      value={f.type}
                      onChange={(e) => changeType(f, e.target.value as FieldType)}
                    >
                      {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                        <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-indigo-600"
                        checked={!!f.required}
                        onChange={(e) => patchField(f.id, { required: e.target.checked })}
                      />
                      Required
                    </label>
                  </div>

                  {isChoice(f.type) && (
                    <div className="space-y-2 rounded-xl bg-gray-50 p-3">
                      {(f.options || []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="h-2 w-2 flex-none rounded-full bg-gray-300" />
                          <input
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
                            value={opt}
                            onChange={(e) => {
                              const options = [...(f.options || [])];
                              options[oi] = e.target.value;
                              patchField(f.id, { options });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => patchField(f.id, { options: (f.options || []).filter((_, x) => x !== oi) })}
                            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-rose-600"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => patchField(f.id, { options: [...(f.options || []), `Option ${(f.options || []).length + 1}`] })}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        <FiPlus className="h-3.5 w-3.5" /> Add option
                      </button>
                    </div>
                  )}

                  <input
                    className="w-full min-w-0 rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-600 outline-none focus:border-indigo-400"
                    placeholder="Helper text under the question (optional)"
                    value={f.help || ''}
                    onChange={(e) => patchField(f.id, { help: e.target.value })}
                  />
                </div>
                <div className="flex flex-none flex-col gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up" className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
                    <FiArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === fields.length - 1} title="Move down" className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
                    <FiArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => duplicateField(i)} title="Duplicate" className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <FiCopy className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeField(f.id)} title="Remove" className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addField}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white py-4 text-sm font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-700"
          >
            <FiPlus className="h-4 w-4" /> Add question
          </button>
        </div>

        {/* settings */}
        <div className="min-w-0 space-y-4">
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Who can fill it</h2>
            {locked && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                Locked — this form already has responses, and switching would change what they mean.
              </p>
            )}
            <div className="space-y-2">
              {([
                { value: 'PRIVATE', icon: <FiLock className="h-4 w-4" />, label: 'Private', note: 'Portal login. Name, registration number and session are filled in.' },
                { value: 'PUBLIC', icon: <FiGlobe className="h-4 w-4" />, label: 'Public', note: 'Anyone with the link, no account needed.' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={locked}
                  onClick={() => patch({ audience: opt.value })}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    form.audience === opt.value ? 'border-indigo-400 bg-indigo-50/60' : 'border-gray-200 hover:bg-gray-50'
                  } ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg ${form.audience === opt.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {opt.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{opt.note}</span>
                  </span>
                </button>
              ))}
            </div>
            {form.audience === 'PRIVATE' && (
              <Toggle
                on={form.oneResponsePerUser}
                onChange={(v) => patch({ oneResponsePerUser: v })}
                label="One response per person"
                note="A second visit shows “you have already answered”."
              />
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">What to record</h2>
            <Toggle
              on={form.collectLocation}
              onChange={(v) => patch({ collectLocation: v, locationRequired: v ? form.locationRequired : false })}
              label="Record location"
              note="The responder is asked every time they open the form."
              icon={<FiMapPin className="h-4 w-4" />}
            />
            {form.collectLocation && (
              <Toggle
                on={form.locationRequired}
                onChange={(v) => patch({ locationRequired: v })}
                label="Location is mandatory"
                note="Without it, the form cannot be submitted at all."
              />
            )}
            <Toggle
              on={form.collectDevice}
              onChange={(v) => patch({ collectDevice: v })}
              label="Record device"
              note="Browser, OS, screen and time zone, hashed into a device code. Repeats are flagged in the report."
              icon={<FiSmartphone className="h-4 w-4" />}
            />
            <p className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
              A browser will not give out a MAC address — no web API exposes one. The device code
              is a fingerprint of the signals it does expose, which is stable enough to recognise
              the same device answering twice.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Close automatically</h2>
            <input
              type="datetime-local"
              className={input}
              value={toLocalInput(form.closesAt)}
              onChange={(e) => patch({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
            {form.closesAt && (
              <button type="button" onClick={() => patch({ closesAt: null })} className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* save bar */}
      <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-gray-500">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex flex-none items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {saving ? <><FiLoader className="h-4 w-4 animate-spin" /> Saving…</> : <><FiSave className="h-4 w-4" /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FormBuilderPage() {
  return (
    <ProtectedRoute requiredRoles={ADMIN_ROLES}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
