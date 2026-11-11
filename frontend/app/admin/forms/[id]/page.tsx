'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiSave, FiLoader, FiArrowLeft,
  FiMapPin, FiSmartphone, FiGlobe, FiLock, FiLink, FiExternalLink, FiCheck,
  FiBarChart2, FiEye, FiAlertCircle, FiCopy, FiImage, FiX,
  FiDownloadCloud, FiUploadCloud, FiGrid, FiClock, FiMaximize, FiDownload,
  FiMove, FiPaperclip, FiDroplet, FiPlayCircle,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { RichEditor, RichView } from '@/app/components/RichText';
import {
  FieldType, FormField, FormOption, FormSummary, Media, ThemeName,
  FIELD_TYPE_LABELS, FILE_ACCEPT_LABELS, THEMES, isChoice, normalizeOptions, fmtDateTime,
} from '@/app/lib/forms';
import { downloadQr, safeFileName } from '@/app/lib/qr';
import { downloadQuestionTemplate, parseQuestionSheet } from '@/app/lib/formTemplate';

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

const inAWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
};

// Tomorrow morning: a sensible first guess for a form meant to start later,
// and never a time already past.
const tomorrowMorning = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
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

// A question's or an option's picture / clip, with the button that replaces it.
const MediaBox = ({ media, onPick, onClear, busy, compact }: {
  media?: Media; onPick: () => void; onClear: () => void; busy: boolean; compact?: boolean;
}) => {
  if (!media) {
    return (
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 font-semibold text-gray-500 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50 ${
          compact ? 'h-7 px-2 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
      >
        {busy ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiImage className="h-3.5 w-3.5" />}
        {compact ? '' : busy ? 'Uploading…' : 'Picture or clip'}
      </button>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 ${compact ? 'h-16 w-16' : 'max-w-xs'}`}>
      {media.kind === 'video' ? (
        <video src={media.url} controls={!compact} muted className={compact ? 'h-full w-full object-cover' : 'max-h-48 w-full'} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.url} alt="" className={compact ? 'h-full w-full object-cover' : 'max-h-48 w-full object-contain'} />
      )}
      <button
        type="button"
        onClick={onClear}
        title="Remove"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        <FiX className="h-3 w-3" />
      </button>
    </div>
  );
};

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
  const [uploading, setUploading] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [displayBusy, setDisplayBusy] = useState(false);
  const [displayCopied, setDisplayCopied] = useState(false);

  // One hidden file input, re-pointed at whatever asked for it.
  const fileInput = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<{ kind: 'header' | 'question' | 'option'; fieldId?: string; index?: number } | null>(null);
  const sheetInput = useRef<HTMLInputElement>(null);

  // Dragging an option by its grip. Pointer events rather than HTML5 drag and
  // drop, so this works the same under a finger as under a mouse.
  const dragState = useRef<{ fieldId: string; index: number } | null>(null);
  const [dragging, setDragging] = useState<{ fieldId: string; index: number } | null>(null);
  const optionRows = useRef<Record<string, (HTMLDivElement | null)[]>>({});

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

  const patchOption = (fieldId: string, index: number, changes: Partial<FormOption>) => {
    setFields((list) => list.map((f) => {
      if (f.id !== fieldId) return f;
      const options = normalizeOptions(f);
      options[index] = { ...options[index], ...changes };
      return { ...f, options };
    }));
    setDirty(true);
  };

  const addField = () => {
    setFields((list) => [...list, { id: newId(), label: '', type: 'short_text', required: false }]);
    setDirty(true);
  };

  const duplicateField = (index: number) => {
    setFields((list) => {
      const copy = { ...list[index], id: newId(), label: `${list[index].label} (copy)`, labelRich: undefined };
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
    if (isChoice(type) && !normalizeOptions(field).length) changes.options = [{ label: 'Option 1' }];
    if (!isChoice(type)) changes.options = undefined;
    if (type === 'file') {
      changes.accept = field.accept || 'any';
      changes.maxSizeMb = field.maxSizeMb || 10;
    }
    patchField(field.id, changes);
  };

  // ---- options ------------------------------------------------------------

  const addOption = (field: FormField) => {
    const options = normalizeOptions(field);
    patchField(field.id, { options: [...options, { label: `Option ${options.length + 1}` }] });
  };

  const removeOption = (field: FormField, index: number) => {
    patchField(field.id, { options: normalizeOptions(field).filter((_, i) => i !== index) });
  };

  const moveOption = (fieldId: string, from: number, to: number) => {
    setFields((list) => list.map((f) => {
      if (f.id !== fieldId) return f;
      const options = normalizeOptions(f);
      if (to < 0 || to >= options.length) return f;
      const [lifted] = options.splice(from, 1);
      options.splice(to, 0, lifted);
      return { ...f, options };
    }));
    setDirty(true);
  };

  const gripDown = (fieldId: string, index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragState.current = { fieldId, index };
    setDragging({ fieldId, index });
  };

  const gripMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const held = dragState.current;
    if (!held) return;
    const rows = optionRows.current[held.fieldId] || [];
    let target = held.index;
    rows.forEach((row, i) => {
      if (!row) return;
      const box = row.getBoundingClientRect();
      if (e.clientY >= box.top && e.clientY <= box.bottom) target = i;
    });
    if (target !== held.index) {
      moveOption(held.fieldId, held.index, target);
      dragState.current = { fieldId: held.fieldId, index: target };
      setDragging({ fieldId: held.fieldId, index: target });
    }
  };

  const gripUp = () => { dragState.current = null; setDragging(null); };

  // ---- uploads ------------------------------------------------------------

  const openPicker = (target: { kind: 'header' | 'question' | 'option'; fieldId?: string; index?: number }) => {
    pickTarget.current = target;
    if (fileInput.current) {
      fileInput.current.value = '';
      fileInput.current.accept = target.kind === 'header'
        ? 'image/jpeg,image/png,image/webp,image/gif'
        : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';
      fileInput.current.click();
    }
  };

  const onFilePicked = async (file: File | undefined) => {
    const target = pickTarget.current;
    if (!file || !target || !form) return;
    const key = target.kind === 'option' ? `${target.fieldId}:${target.index}` : target.fieldId || 'header';
    try {
      setUploading(key);
      const body = new FormData();
      body.append('file', file);
      const res = await apiClient.post(`/forms/${form.id}/media`, body);
      const media: Media = res.data.media;
      if (target.kind === 'header') patch({ headerImageUrl: media.url });
      else if (target.kind === 'question' && target.fieldId) patchField(target.fieldId, { media });
      else if (target.kind === 'option' && target.fieldId && target.index !== undefined) {
        patchOption(target.fieldId, target.index, { media });
      }
      toast.success('Uploaded — remember to save');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'That file could not be uploaded');
    } finally {
      setUploading(null);
      pickTarget.current = null;
    }
  };

  // ---- bulk questions -----------------------------------------------------

  const onSheetPicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImporting(true);
      const { fields: imported, warnings } = await parseQuestionSheet(file, newId);
      if (!imported.length) {
        toast.error(warnings[0] || 'No questions were found in that file.');
        return;
      }
      setFields((list) => [...list, ...imported]);
      setDirty(true);
      toast.success(`${imported.length} question${imported.length === 1 ? '' : 's'} added — review them, then save`);
      warnings.slice(0, 3).forEach((w) => toast.error(w, { duration: 6000 }));
    } catch {
      toast.error('That file could not be read. Start from the template.');
    } finally {
      setImporting(false);
      if (sheetInput.current) sheetInput.current.value = '';
    }
  };

  const setAllRequired = (required: boolean) => {
    setFields((list) => list.map((f) => ({ ...f, required })));
    setDirty(true);
    toast.success(required ? 'Every question is now required' : 'No question is required now');
  };

  // ---- save / publish -----------------------------------------------------

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
        opensAt: form.opensAt,
        closesAt: form.closesAt,
        theme: form.theme,
        headerImageUrl: form.headerImageUrl,
        requireQrToken: form.requireQrToken,
        qrWindowSeconds: form.qrWindowSeconds,
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

  const publicLink = form ? `${typeof window === 'undefined' ? '' : window.location.origin}/f/${form.slug}` : '';

  const copyLink = async () => {
    if (!form) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(publicLink);
    }
  };

  // The display link runs a scanning point on a screen nobody has signed in
  // on, so several can run at once. Asking for it mints one the first time.
  const copyDisplayLink = async (rotate = false) => {
    if (!form) return;
    if (rotate && !window.confirm('Make a new display link?\n\nEvery screen using the old one will stop showing codes until you give it the new link.')) return;
    try {
      setDisplayBusy(true);
      const res = await apiClient.get(`/forms/${form.id}/display-link${rotate ? '?rotate=1' : ''}`);
      const url = `${window.location.origin}${res.data.path}`;
      try {
        await navigator.clipboard.writeText(url);
        setDisplayCopied(true);
        setTimeout(() => setDisplayCopied(false), 2500);
        toast.success(rotate ? 'New link copied — the old one has stopped working' : 'Display link copied');
      } catch {
        toast.error(url);
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not make a display link');
    } finally {
      setDisplayBusy(false);
    }
  };

  const revokeDisplayLink = async () => {
    if (!form) return;
    if (!window.confirm('Revoke the display link?\n\nEvery screen using it stops showing codes straight away.')) return;
    try {
      setDisplayBusy(true);
      const res = await apiClient.delete(`/forms/${form.id}/display-link`);
      toast.success(res.data.message);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not revoke the display link');
    } finally {
      setDisplayBusy(false);
    }
  };

  const saveQr = async () => {
    if (!form) return;
    try {
      await downloadQr(publicLink, `${safeFileName(form.title)}-qr`);
      toast.success('QR code saved');
    } catch {
      toast.error('Could not build the QR code');
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
  const requiredCount = fields.filter((f) => f.required).length;

  return (
    <div className="w-full min-w-0 space-y-5 pb-24">
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={(e) => onFilePicked(e.target.files?.[0])}
      />
      <input
        ref={sheetInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => onSheetPicked(e.target.files?.[0])}
      />

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
        <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FiLink className="h-4 w-4 flex-none text-emerald-700" />
            <code className="min-w-0 flex-1 truncate text-xs text-emerald-900">{publicLink}</code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
              {copied ? <><FiCheck className="h-3.5 w-3.5" /> Copied</> : <><FiLink className="h-3.5 w-3.5" /> Copy link</>}
            </button>
            <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
              <FiExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            <button type="button" onClick={saveQr} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
              <FiDownload className="h-3.5 w-3.5" /> Download QR
            </button>
            {/* An in-app link, not a new tab: a cold load of an admin route
                lands on the sign-in page before the session rehydrates. */}
            <Link href={`/admin/forms/${form.id}/qr`} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
              <FiMaximize className="h-3.5 w-3.5" /> Display QR
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* questions */}
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {form.headerImageUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.headerImageUrl} alt="" className="h-32 w-full object-cover sm:h-44" />
                <button
                  type="button"
                  onClick={() => patch({ headerImageUrl: null })}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  title="Remove the banner"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="p-5">
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Title</label>
              <input className={input} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-gray-900">Description <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea rows={3} className={input} value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Shown to the responder above the first question" />
            </div>
          </div>

          {fields.map((f, i) => {
            const options = normalizeOptions(f);
            return (
              <div key={f.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-2.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <RichEditor
                      rich={f.labelRich}
                      text={f.label}
                      placeholder="Question"
                      onChange={({ rich, text }) => patchField(f.id, { labelRich: rich || undefined, label: text })}
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
                      <MediaBox
                        media={f.media}
                        busy={uploading === f.id}
                        onPick={() => openPicker({ kind: 'question', fieldId: f.id })}
                        onClear={() => patchField(f.id, { media: undefined })}
                        compact={!!f.media}
                      />
                    </div>

                    {f.type === 'file' && (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-3">
                        <FiPaperclip className="h-3.5 w-3.5 flex-none text-gray-500" />
                        <select
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-400"
                          value={f.accept || 'any'}
                          onChange={(e) => patchField(f.id, { accept: e.target.value as FormField['accept'] })}
                        >
                          {(Object.keys(FILE_ACCEPT_LABELS) as (keyof typeof FILE_ACCEPT_LABELS)[]).map((k) => (
                            <option key={k} value={k}>{FILE_ACCEPT_LABELS[k]}</option>
                          ))}
                        </select>
                        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                          up to
                          <input
                            type="number"
                            min={1}
                            max={25}
                            value={f.maxSizeMb ?? 10}
                            onChange={(e) => patchField(f.id, { maxSizeMb: Number(e.target.value) })}
                            className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                          />
                          MB
                        </label>
                      </div>
                    )}

                    {isChoice(f.type) && (
                      <div className="space-y-2 rounded-xl bg-gray-50 p-3">
                        {options.map((opt, oi) => {
                          const isHeld = dragging?.fieldId === f.id && dragging.index === oi;
                          return (
                            <div
                              key={oi}
                              ref={(el) => {
                                if (!optionRows.current[f.id]) optionRows.current[f.id] = [];
                                optionRows.current[f.id][oi] = el;
                              }}
                              className={`flex items-start gap-2 rounded-xl bg-white p-2 transition ${
                                isHeld ? 'ring-2 ring-indigo-400' : 'ring-1 ring-gray-100'
                              }`}
                            >
                              <button
                                type="button"
                                title="Drag to reorder"
                                onPointerDown={gripDown(f.id, oi)}
                                onPointerMove={gripMove}
                                onPointerUp={gripUp}
                                onPointerCancel={gripUp}
                                className="mt-1.5 flex h-7 w-6 flex-none cursor-grab touch-none items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
                              >
                                <FiMove className="h-3.5 w-3.5" />
                              </button>
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <RichEditor
                                  rich={opt.rich}
                                  text={opt.label}
                                  singleLine
                                  minHeight={34}
                                  placeholder={`Option ${oi + 1}`}
                                  onChange={({ rich, text }) => patchOption(f.id, oi, { rich: rich || undefined, label: text })}
                                />
                                {opt.media && (
                                  <MediaBox
                                    media={opt.media}
                                    busy={false}
                                    onPick={() => openPicker({ kind: 'option', fieldId: f.id, index: oi })}
                                    onClear={() => patchOption(f.id, oi, { media: undefined })}
                                    compact
                                  />
                                )}
                              </div>
                              <div className="mt-1 flex flex-none flex-col gap-0.5 sm:flex-row">
                                {!opt.media && (
                                  <button
                                    type="button"
                                    title="Add a picture or clip to this option"
                                    onClick={() => openPicker({ kind: 'option', fieldId: f.id, index: oi })}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-700"
                                  >
                                    {uploading === `${f.id}:${oi}` ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiImage className="h-3.5 w-3.5" />}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Move up"
                                  disabled={oi === 0}
                                  onClick={() => moveOption(f.id, oi, oi - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                                >
                                  <FiArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  title="Move down"
                                  disabled={oi === options.length - 1}
                                  onClick={() => moveOption(f.id, oi, oi + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                                >
                                  <FiArrowDown className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  title="Remove this option"
                                  onClick={() => removeOption(f, oi)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => addOption(f)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                        >
                          <FiPlus className="h-3.5 w-3.5" /> Add option
                        </button>
                      </div>
                    )}

                    <RichEditor
                      rich={f.helpRich}
                      text={f.help}
                      minHeight={34}
                      placeholder="Helper text under the question (optional)"
                      onChange={({ rich, text }) => patchField(f.id, { helpRich: rich || undefined, help: text })}
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
            );
          })}

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

          {/* look and feel */}
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <FiDroplet className="h-3.5 w-3.5 text-gray-400" /> How it looks
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(THEMES) as ThemeName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => patch({ theme: name })}
                  title={THEMES[name].label}
                  className={`group flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${
                    form.theme === name ? 'border-indigo-400 bg-indigo-50/60' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`h-7 w-full rounded-lg ${THEMES[name].swatch}`} />
                  <span className="truncate text-[10px] font-semibold text-gray-600">{THEMES[name].label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openPicker({ kind: 'header' })}
              disabled={uploading === 'header'}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
            >
              {uploading === 'header'
                ? <><FiLoader className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                : <><FiImage className="h-3.5 w-3.5" /> {form.headerImageUrl ? 'Replace the banner' : 'Add a banner image'}</>}
            </button>
            {form.headerImageUrl && (
              <button type="button" onClick={() => patch({ headerImageUrl: null })} className="w-full text-xs font-semibold text-gray-500 hover:text-rose-600">
                Remove the banner
              </button>
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

          {/* when it runs */}
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">When it runs</h2>
            <Toggle
              on={!!form.opensAt}
              onChange={(v) => patch({ opensAt: v ? tomorrowMorning() : null })}
              label="Open at a set time"
              note={form.opensAt ? 'Until then it turns everyone away, even once published.' : 'Off — it starts taking responses the moment you publish it.'}
              icon={<FiPlayCircle className="h-4 w-4" />}
            />
            {!!form.opensAt && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600">Opening date and time</label>
                <input
                  type="datetime-local"
                  className={input}
                  value={toLocalInput(form.opensAt)}
                  onChange={(e) => patch({ opensAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <Toggle
                on={!!form.closesAt}
                onChange={(v) => patch({ closesAt: v ? inAWeek() : null })}
                label="Close at a set time"
                note={form.closesAt ? 'It stops accepting responses then.' : 'Off — it stays open until you close it.'}
                icon={<FiClock className="h-4 w-4" />}
              />
              {!!form.closesAt && (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-semibold text-gray-600">Closing date and time</label>
                  <input
                    type="datetime-local"
                    className={input}
                    value={toLocalInput(form.closesAt)}
                    onChange={(e) => patch({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </div>
              )}
            </div>

            <p className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
              Both times are in your own time zone, as your computer reports it.
              {form.opensAt && form.closesAt ? ' The form accepts responses only between the two.' : ''}
            </p>
            {!!form.opensAt && !!form.closesAt && new Date(form.opensAt) >= new Date(form.closesAt) && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-rose-700">
                That window closes before it opens, so nobody could ever answer. Saving will be refused.
              </p>
            )}
            {form.waitingToOpen && !!form.opensAt && form.status === 'PUBLISHED' && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                Published, but not yet open — anyone with the link sees a “not open yet” notice until {fmtDateTime(form.opensAt)}.
              </p>
            )}
          </div>

          {/* QR entry */}
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <FiGrid className="h-3.5 w-3.5 text-gray-400" /> QR code
            </h2>
            <Toggle
              on={form.requireQrToken}
              onChange={(v) => patch({ requireQrToken: v })}
              label="Only open from the live QR code"
              note="The plain link stops working. Only a code scanned from the display screen opens the form."
              icon={<FiMaximize className="h-4 w-4" />}
            />
            {form.requireQrToken && (
              <label className="block">
                <span className="block text-xs font-semibold text-gray-600">A code lasts</span>
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={form.qrWindowSeconds}
                    onChange={(e) => patch({ qrWindowSeconds: Number(e.target.value) })}
                    className="w-20 rounded-xl border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                  <span className="text-xs text-gray-500">seconds on screen</span>
                </span>
              </label>
            )}
            <p className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
              {form.requireQrToken
                ? 'A photograph of the screen is useless once that code rotates. Whoever scans it in time gets long enough to finish the form.'
                : 'With this off, the rotating code still rotates — but the plain link keeps working, so a shared screenshot can be worked around by anyone who has the link.'}
            </p>
            {form.status === 'PUBLISHED' ? (
              <>
                <Link
                  href={`/admin/forms/${form.id}/qr`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  <FiMaximize className="h-3.5 w-3.5" /> Open the display screen
                </Link>
                <button
                  type="button"
                  onClick={() => copyDisplayLink(false)}
                  disabled={displayBusy}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {displayBusy ? <FiLoader className="h-3.5 w-3.5 animate-spin" />
                    : displayCopied ? <FiCheck className="h-3.5 w-3.5 text-emerald-600" />
                    : <FiLink className="h-3.5 w-3.5" />}
                  {displayCopied ? 'Copied' : 'Copy the display link'}
                </button>
                <p className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
                  Open that link on any screen — a gate, a hall door, a desk — and it shows the same
                  rotating code without a sign-in. Treat it as a key: whoever holds it can put a live
                  code on a screen until you withdraw it.
                </p>
                {form.hasDisplayLink && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copyDisplayLink(true)}
                      disabled={displayBusy}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      New link
                    </button>
                    <button
                      type="button"
                      onClick={revokeDisplayLink}
                      disabled={displayBusy}
                      className="flex-1 rounded-lg border border-rose-200 px-2 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[11px] text-gray-400">Publish the form to get its code.</p>
            )}
          </div>

          {/* bulk */}
          <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Questions in bulk</h2>
            <button
              type="button"
              onClick={() => { downloadQuestionTemplate(); toast.success('Template downloaded'); }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiDownloadCloud className="h-3.5 w-3.5" /> Download the template
            </button>
            <button
              type="button"
              onClick={() => sheetInput.current?.click()}
              disabled={importing}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {importing
                ? <><FiLoader className="h-3.5 w-3.5 animate-spin" /> Reading…</>
                : <><FiUploadCloud className="h-3.5 w-3.5" /> Upload questions</>}
            </button>
            <p className="text-[11px] leading-relaxed text-gray-500">
              Imported questions are added to the end as plain text. Formatting, pictures and file
              limits are set here afterwards.
            </p>
            <div className="border-t border-gray-100 pt-2.5">
              <p className="text-xs font-semibold text-gray-600">
                {requiredCount} of {fields.length} question{fields.length === 1 ? '' : 's'} required
              </p>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllRequired(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Make none required
                </button>
                <button
                  type="button"
                  onClick={() => setAllRequired(true)}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Require all
                </button>
              </div>
            </div>
          </div>

          {/* a glance at the formatting */}
          {fields.some((f) => f.labelRich) && (
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-bold text-gray-900">Formatted questions</h2>
              {fields.filter((f) => f.labelRich).slice(0, 5).map((f) => (
                <p key={f.id} className="truncate text-xs text-gray-700">
                  <RichView rich={f.labelRich} text={f.label} />
                </p>
              ))}
              <p className="text-[11px] text-gray-400">This is how the formatting will read on the form itself.</p>
            </div>
          )}
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
