'use client';

// Curating one department page.
//
// Three things are written once — a title, a description and a cover
// picture — and everything else is an entry filed under one of the fourteen
// categories, each with its own document or picture. The chair head owns
// all of it; an admin or HOD can do the same on any department, plus rename
// it, appoint its chair head, publish it or delete it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiLoader, FiSave, FiPlus, FiTrash2, FiEdit2, FiEye, FiEyeOff,
  FiImage, FiUploadCloud, FiExternalLink, FiPaperclip, FiX, FiChevronDown,
  FiChevronRight, FiCheck, FiLink,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  ACCEPT_ANY, ACCEPT_IMAGE, DEPARTMENT_CATEGORIES, Department, DepartmentCategory,
  DepartmentEntry, EntriesByCategory, fileLabel,
} from '@/app/lib/departments';

const ROLES = ['ADMIN', 'HOD', 'CHAIR_HEAD', 'FACULTY'];
const apiMessage = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || '';
const input = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

type ChairHead = { id: string; firstName: string | null; lastName: string | null; email: string; approvedRole: string };
type Draft = {
  id?: string;
  category: string;
  title: string;
  details: string;
  linkUrl: string;
  fileUrl: string | null;
  fileName: string | null;
  fileKind: 'image' | 'document' | null;
  isHidden: boolean;
};

const emptyDraft = (category: string): Draft => ({
  category, title: '', details: '', linkUrl: '',
  fileUrl: null, fileName: null, fileKind: null, isHidden: false,
});

function Content() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const router = useRouter();

  const [dept, setDept] = useState<Department | null>(null);
  const [categories, setCategories] = useState<DepartmentCategory[]>(DEPARTMENT_CATEGORIES);
  const [entries, setEntries] = useState<EntriesByCategory>({});
  const [canAdmin, setCanAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [people, setPeople] = useState<ChairHead[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/departments/manage/${id}`);
      setDept(data.department);
      setCategories(data.categories || DEPARTMENT_CATEGORIES);
      setEntries(data.entries || {});
      setCanAdmin(!!data.canAdmin);
      setDirty(false);
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not open that department');
      router.push('/admin/departments');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { if (id) load(); }, [id, load]);

  useEffect(() => {
    if (!canAdmin) return;
    (async () => {
      try {
        const { data } = await apiClient.get('/departments/chair-heads');
        setPeople(data.users || []);
      } catch { setPeople([]); }
    })();
  }, [canAdmin]);

  const patch = (fields: Partial<Department>) => {
    setDept((prev) => (prev ? { ...prev, ...fields } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!dept) return;
    try {
      setSaving(true);
      const body: Record<string, unknown> = {
        title: dept.title,
        description: dept.description,
        coverImageUrl: dept.coverImageUrl,
      };
      if (canAdmin) {
        body.name = dept.name;
        body.chairHeadId = dept.chairHeadId;
        body.isHidden = dept.isHidden;
      }
      const { data } = await apiClient.patch(`/departments/${dept.id}`, body);
      setDept(data.department);
      setDirty(false);
      toast.success(data.message || 'Saved');
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not save the page');
    } finally {
      setSaving(false);
    }
  };

  // Uploads land in our own bucket and come back as a URL; the entry or the
  // cover then simply points at it.
  const uploadFile = async (file: File): Promise<{ url: string; name: string; kind: 'image' | 'document' } | null> => {
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await apiClient.post(`/departments/${id}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'That file could not be uploaded');
      return null;
    }
  };

  const onCover = async (file?: File) => {
    if (!file) return;
    setUploadingCover(true);
    const up = await uploadFile(file);
    setUploadingCover(false);
    if (coverInput.current) coverInput.current.value = '';
    if (!up) return;
    patch({ coverImageUrl: up.url });
    toast.success('Cover picture uploaded — save the page to keep it');
  };

  const saveEntry = async (d: Draft) => {
    if (!d.title.trim()) { toast.error('Give the entry a title'); return; }
    try {
      const body = {
        category: d.category,
        title: d.title.trim(),
        details: d.details,
        linkUrl: d.linkUrl,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        fileKind: d.fileKind,
        isHidden: d.isHidden,
      };
      const { data } = d.id
        ? await apiClient.patch(`/departments/${id}/entries/${d.id}`, body)
        : await apiClient.post(`/departments/${id}/entries`, body);
      toast.success(data.message || 'Saved');
      setDraft(null);
      await load();
      setOpen(d.category);
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not save the entry');
    }
  };

  const toggleEntry = async (entry: DepartmentEntry) => {
    try {
      await apiClient.patch(`/departments/${id}/entries/${entry.id}`, { isHidden: !entry.isHidden });
      await load();
      setOpen(entry.category);
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not change that');
    }
  };

  const deleteEntry = async (entry: DepartmentEntry) => {
    if (!confirm(`Delete "${entry.title}"?\n\nThis cannot be undone.`)) return;
    try {
      const { data } = await apiClient.delete(`/departments/${id}/entries/${entry.id}`);
      toast.success(data.message || 'Entry deleted');
      await load();
      setOpen(entry.category);
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not delete the entry');
    }
  };

  if (loading || !dept) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FiLoader className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalEntries = Object.values(entries).reduce((n, list) => n + list.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pb-28 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/departments" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800">
            <FiArrowLeft className="h-3.5 w-3.5" /> All departments
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold text-gray-900">{dept.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} across {categories.length} categories
            {dept.chairHeadName ? ` · curated by ${dept.chairHeadName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
            dept.isHidden ? 'bg-amber-100 text-amber-800 ring-amber-200' : 'bg-emerald-100 text-emerald-800 ring-emerald-200'
          }`}>
            {dept.isHidden ? <><FiEyeOff className="h-3 w-3" /> hidden</> : <><FiEye className="h-3 w-3" /> on the website</>}
          </span>
          <a
            href={`/departments/${dept.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FiExternalLink className="h-3.5 w-3.5" /> View the page
          </a>
        </div>
      </div>

      {/* ── The page itself ── */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900">The page itself</h2>
        <label className="block">
          <span className="block text-xs font-semibold text-gray-600">Title</span>
          <input
            value={dept.title}
            onChange={(e) => patch({ title: e.target.value })}
            maxLength={300}
            placeholder={dept.name}
            className={`mt-1 ${input}`}
          />
          <span className="mt-1 block text-[11px] text-gray-500">The headline at the top of the page. Left empty, the department name is used.</span>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-gray-600">Description</span>
          <textarea
            rows={4}
            value={dept.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="What this department does, in a paragraph or two."
            className={`mt-1 ${input}`}
          />
        </label>

        <div>
          <span className="block text-xs font-semibold text-gray-600">Cover image</span>
          <div className="mt-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {dept.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dept.coverImageUrl} alt="" className="h-44 w-full object-cover" />
            ) : (
              <div className="flex h-44 w-full items-center justify-center text-gray-300">
                <FiImage className="h-8 w-8" />
              </div>
            )}
          </div>
          <input ref={coverInput} type="file" accept={ACCEPT_IMAGE} className="hidden"
            onChange={(e) => onCover(e.target.files?.[0])} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              disabled={uploadingCover}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {uploadingCover ? <><FiLoader className="h-3.5 w-3.5 animate-spin" /> Uploading…</> : <><FiUploadCloud className="h-3.5 w-3.5" /> {dept.coverImageUrl ? 'Replace the cover' : 'Upload a cover'}</>}
            </button>
            {dept.coverImageUrl && (
              <button type="button" onClick={() => patch({ coverImageUrl: null })} className="text-xs font-semibold text-gray-500 hover:text-rose-600">
                Remove it
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">This is the picture on the department&apos;s card on the landing page. JPG, PNG, WEBP or GIF, up to 10 MB.</p>
        </div>
      </div>

      {/* ── Admin-only settings ── */}
      {canAdmin && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900">Department settings</h2>
          <p className="text-[11px] text-gray-500">Admin and HOD only — the chair head cannot change these.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-semibold text-gray-600">Name</span>
              <input value={dept.name} onChange={(e) => patch({ name: e.target.value })} maxLength={160} className={`mt-1 ${input}`} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-600">Chair head</span>
              <select
                value={dept.chairHeadId || ''}
                onChange={(e) => patch({ chairHeadId: e.target.value || null })}
                className={`mt-1 ${input}`}
              >
                <option value="">Nobody yet</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email} — {p.approvedRole}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!dept.isHidden}
              onChange={(e) => patch({ isHidden: !e.target.checked })}
            />
            <span className="text-xs text-gray-700">
              <strong className="font-semibold">Show on the website.</strong>{' '}
              The card appears on the landing page and anyone can open the page. Hidden means staff-only.
            </span>
          </label>
          <p className="text-[11px] text-gray-500">Public address: <code className="rounded bg-gray-100 px-1.5 py-0.5">/departments/{dept.slug}</code></p>
        </div>
      )}

      {/* ── The fourteen categories ── */}
      <div className="space-y-2">
        <h2 className="px-1 text-sm font-bold text-gray-900">What the page shows</h2>
        {categories.map((c) => {
          const list = entries[c.key] || [];
          const isOpen = open === c.key;
          const hidden = list.filter((e) => e.isHidden).length;
          return (
            <div key={c.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {isOpen ? <FiChevronDown className="h-4 w-4 flex-none text-gray-400" /> : <FiChevronRight className="h-4 w-4 flex-none text-gray-400" />}
                  <span className="truncate text-sm font-bold text-gray-900">{c.label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{list.length}</span>
                  {!!hidden && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{hidden} hidden</span>}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setOpen(c.key); setDraft(emptyDraft(c.key)); }}
                  className="inline-flex flex-none items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-white"
                >
                  <FiPlus className="h-3 w-3" /> Add
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/60 p-3">
                  {list.length === 0 ? (
                    <p className="py-6 text-center text-sm italic text-gray-400">Nothing under {c.label} yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                            <th className="px-3 py-2 font-semibold">Title</th>
                            <th className="px-3 py-2 font-semibold">Details</th>
                            <th className="px-3 py-2 font-semibold">Attachment</th>
                            <th className="px-3 py-2 text-right font-semibold">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {list.map((e) => (
                            <tr key={e.id} className={`align-top ${e.isHidden ? 'bg-amber-50/40' : ''}`}>
                              <td className="px-3 py-2">
                                <div className="font-semibold text-gray-900">{e.title}</div>
                                {e.isHidden && <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700"><FiEyeOff className="h-3 w-3" /> hidden from the website</span>}
                                {e.linkUrl && (
                                  <a href={e.linkUrl} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline">
                                    <FiLink className="h-3 w-3" /> link
                                  </a>
                                )}
                              </td>
                              <td className="max-w-[280px] whitespace-pre-wrap break-words px-3 py-2 text-xs text-gray-600">
                                {e.details || <span className="italic text-gray-400">—</span>}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {e.fileUrl ? (
                                  <a href={e.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline">
                                    {e.fileKind === 'image' ? <FiImage className="h-3.5 w-3.5" /> : <FiPaperclip className="h-3.5 w-3.5" />}
                                    <span className="max-w-[160px] truncate">{e.fileName || fileLabel(e)}</span>
                                  </a>
                                ) : <span className="italic text-gray-400">none</span>}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" title={e.isHidden ? 'Show on the website' : 'Hide from the website'}
                                    onClick={() => toggleEntry(e)}
                                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                                    {e.isHidden ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
                                  </button>
                                  <button type="button" title="Edit this entry"
                                    onClick={() => setDraft({
                                      id: e.id, category: e.category, title: e.title, details: e.details,
                                      linkUrl: e.linkUrl || '', fileUrl: e.fileUrl, fileName: e.fileName,
                                      fileKind: e.fileKind, isHidden: e.isHidden,
                                    })}
                                    className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                                    <FiEdit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" title="Delete this entry" onClick={() => deleteEntry(e)}
                                    className="rounded p-1.5 text-red-600 hover:bg-red-50">
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save bar — the singular fields only; entries save as they are made. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className="text-xs text-gray-500">{dirty ? 'Unsaved changes to the page' : 'All changes saved'}</span>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSave className="h-4 w-4" />} Save
          </button>
        </div>
      </div>

      {draft && (
        <EntryModal
          draft={draft}
          categories={categories}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={() => saveEntry(draft)}
          onUpload={uploadFile}
        />
      )}
    </div>
  );
}

function EntryModal({
  draft, categories, onChange, onClose, onSave, onUpload,
}: {
  draft: Draft;
  categories: DepartmentCategory[];
  onChange: (d: Draft) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onUpload: (file: File) => Promise<{ url: string; name: string; kind: 'image' | 'document' } | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const label = categories.find((c) => c.key === draft.category)?.label || draft.category;

  const attach = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const up = await onUpload(file);
    setUploading(false);
    if (fileInput.current) fileInput.current.value = '';
    if (!up) return;
    onChange({ ...draft, fileUrl: up.url, fileName: up.name, fileKind: up.kind });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{draft.id ? 'Edit entry' : `Add to ${label}`}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
        </div>

        <label className="mt-4 block">
          <span className="block text-xs font-semibold text-gray-600">Category</span>
          <select value={draft.category} onChange={(e) => onChange({ ...draft, category: e.target.value })} className={`mt-1 ${input}`}>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="block text-xs font-semibold text-gray-600">Title</span>
          <input value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} maxLength={300}
            placeholder="A name, a project, a paper…" className={`mt-1 ${input}`} />
        </label>

        <label className="mt-3 block">
          <span className="block text-xs font-semibold text-gray-600">Details</span>
          <textarea rows={4} value={draft.details} onChange={(e) => onChange({ ...draft, details: e.target.value })}
            placeholder="What a reader should know about it." className={`mt-1 ${input}`} />
        </label>

        <label className="mt-3 block">
          <span className="block text-xs font-semibold text-gray-600">Link (optional)</span>
          <input value={draft.linkUrl} onChange={(e) => onChange({ ...draft, linkUrl: e.target.value })}
            placeholder="https://…" className={`mt-1 ${input}`} />
        </label>

        <div className="mt-3">
          <span className="block text-xs font-semibold text-gray-600">Document or picture (optional)</span>
          <input ref={fileInput} type="file" accept={ACCEPT_ANY} className="hidden" onChange={(e) => attach(e.target.files?.[0])} />
          {draft.fileUrl ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <a href={draft.fileUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-xs font-semibold text-blue-700 hover:underline">
                {draft.fileKind === 'image' ? <FiImage className="h-4 w-4 flex-none" /> : <FiPaperclip className="h-4 w-4 flex-none" />}
                <span className="truncate">{draft.fileName}</span>
              </a>
              <button type="button" onClick={() => onChange({ ...draft, fileUrl: null, fileName: null, fileKind: null })}
                className="flex-none text-xs font-semibold text-gray-500 hover:text-rose-600">Remove</button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
              className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
              {uploading ? <><FiLoader className="h-3.5 w-3.5 animate-spin" /> Uploading…</> : <><FiUploadCloud className="h-3.5 w-3.5" /> Upload a document or picture</>}
            </button>
          )}
          <p className="mt-1 text-[11px] text-gray-500">PDF, Word, Excel, PowerPoint, CSV or a picture. Pictures up to 10 MB, documents up to 25 MB.</p>
        </div>

        <label className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
          <input type="checkbox" className="mt-0.5" checked={draft.isHidden} onChange={(e) => onChange({ ...draft, isHidden: e.target.checked })} />
          <span className="text-xs text-gray-700">
            <strong className="font-semibold">Keep this hidden for now.</strong>{' '}
            It stays on this screen and off the public page until you show it.
          </span>
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            onClick={async () => { setBusy(true); await onSave(); setBusy(false); }}
            disabled={busy || uploading}
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <FiCheck className="h-4 w-4" /> {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Add entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CurateDepartmentPage() {
  return (
    <ProtectedRoute requiredRoles={ROLES}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
