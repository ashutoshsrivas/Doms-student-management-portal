'use client';

// The departments an account may curate.
//
// An admin or HOD sees every department and can add one; a chair head sees
// the one that is theirs, and goes straight into it.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiPlus, FiLoader, FiEye, FiEyeOff, FiExternalLink, FiTrash2, FiEdit2,
  FiLayers, FiUser, FiImage, FiX, FiSettings,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { Department } from '@/app/lib/departments';

const ROLES = ['ADMIN', 'HOD', 'CHAIR_HEAD', 'FACULTY'];
const apiMessage = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || '';

type ChairHead = { id: string; firstName: string | null; lastName: string | null; email: string; approvedRole: string };

function Content() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/departments/manage');
      setDepartments(data.departments || []);
      setCanCreate(!!data.canCreate);
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not load the departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePublished = async (d: Department) => {
    try {
      await apiClient.patch(`/departments/${d.id}`, { isHidden: !d.isHidden });
      toast.success(d.isHidden ? `${d.name} is on the website` : `${d.name} is hidden from the website`);
      await load();
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not change that');
    }
  };

  const remove = async (d: Department) => {
    const n = d.counts?.total || 0;
    const takes = n === 0
      ? 'The page comes off the website.'
      : `Its ${n} ${n === 1 ? 'entry goes' : 'entries go'} too, and the page comes off the website.`;
    if (!confirm(`Delete "${d.name}"?\n\n${takes} This cannot be undone.`)) return;
    try {
      const { data } = await apiClient.delete(`/departments/${d.id}`);
      toast.success(data.message || 'Department deleted');
      await load();
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not delete the department');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Each department has its own page on the public website, curated by its chair head.
            {canCreate ? ' Add one, appoint a chair head, and it appears as a card on the landing page once it is published.' : ' Fill in yours and it appears as a card on the landing page.'}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <FiPlus className="h-4 w-4" /> New department
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          <FiLoader className="mx-auto h-5 w-5 animate-spin" />
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <FiLayers className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-gray-900">
            {canCreate ? 'No departments yet' : 'No department page is yours yet'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {canCreate
              ? 'Add the first one — Department of Marketing, Department of Finance, and so on.'
              : 'An admin appoints the chair head of a department. Once that is you, the page appears here.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <div key={d.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
              <div className="relative h-32 w-full bg-gray-100">
                {d.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.coverImageUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center text-gray-300">
                    <FiImage className="h-7 w-7" />
                  </div>
                )}
                <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                  d.isHidden ? 'bg-amber-100 text-amber-800 ring-amber-200' : 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                }`}>
                  {d.isHidden ? <><FiEyeOff className="h-3 w-3" /> hidden</> : <><FiEye className="h-3 w-3" /> on the website</>}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col p-4">
                <h2 className="truncate font-bold text-gray-900">{d.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{d.title || d.description || 'Nothing written yet.'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <FiUser className="h-3 w-3" /> {d.chairHeadName || <span className="text-amber-700">no chair head</span>}
                  </span>
                  <span>{d.counts?.total ?? 0} entries</span>
                  {!!d.counts?.hidden && <span className="text-amber-700">{d.counts.hidden} hidden</span>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
                  <Link
                    href={`/admin/departments/${d.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                  >
                    <FiEdit2 className="h-3.5 w-3.5" /> Curate
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <FiSettings className="h-3.5 w-3.5" /> Details
                  </button>
                  <a
                    href={`/departments/${d.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <FiExternalLink className="h-3.5 w-3.5" /> View
                  </a>
                  {canCreate && (
                    <>
                      <button
                        type="button"
                        onClick={() => togglePublished(d)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        {d.isHidden ? <><FiEye className="h-3.5 w-3.5" /> Publish</> : <><FiEyeOff className="h-3.5 w-3.5" /> Hide</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(d)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <NewDepartmentModal onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); await load(); }} />
      )}

      {editing && (
        <EditDepartmentModal
          department={editing}
          canAdmin={canCreate}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
          onDelete={canCreate ? async () => { setEditing(null); await remove(editing); } : undefined}
        />
      )}
    </div>
  );
}

function NewDepartmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void | Promise<void> }) {
  const [name, setName] = useState('');
  const [chairHeadId, setChairHeadId] = useState('');
  const [people, setPeople] = useState<ChairHead[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/departments/chair-heads');
        setPeople(data.users || []);
      } catch { setPeople([]); }
    })();
  }, []);

  const save = async () => {
    if (!name.trim()) { toast.error('Give the department a name'); return; }
    try {
      setBusy(true);
      const { data } = await apiClient.post('/departments', { name: name.trim(), chairHeadId: chairHeadId || null });
      toast.success(data.message || 'Department added');
      await onCreated();
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not add the department');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">New department</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
        </div>
        <label className="mt-4 block">
          <span className="block text-xs font-semibold text-gray-600">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department of Marketing"
            maxLength={160}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="mt-3 block">
          <span className="block text-xs font-semibold text-gray-600">Chair head</span>
          <select
            value={chairHeadId}
            onChange={(e) => setChairHeadId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Appoint later</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email} — {p.approvedRole}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-gray-500">
            They can then write the page themselves. You keep the right to edit, hide or delete anything on it.
          </span>
        </label>
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
          It starts hidden, so nothing half-written reaches the website. Publish it when the page is ready.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Adding…' : 'Add department'}
          </button>
        </div>
      </div>
    </div>
  );
}

// The quick way to change a department without opening its page: the title
// and description, and — for an admin or HOD — its name, its chair head,
// whether it is on the website, and deleting it outright.
function EditDepartmentModal({
  department, canAdmin, onClose, onSaved, onDelete,
}: {
  department: Department;
  canAdmin: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const [name, setName] = useState(department.name);
  const [title, setTitle] = useState(department.title);
  const [description, setDescription] = useState(department.description);
  const [chairHeadId, setChairHeadId] = useState(department.chairHeadId || '');
  const [isHidden, setIsHidden] = useState(department.isHidden);
  const [people, setPeople] = useState<ChairHead[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canAdmin) return;
    (async () => {
      try {
        const { data } = await apiClient.get('/departments/chair-heads');
        setPeople(data.users || []);
      } catch { setPeople([]); }
    })();
  }, [canAdmin]);

  const save = async () => {
    if (canAdmin && !name.trim()) { toast.error('A department needs a name'); return; }
    try {
      setBusy(true);
      const body: Record<string, unknown> = { title, description };
      if (canAdmin) {
        body.name = name.trim();
        body.chairHeadId = chairHeadId || null;
        body.isHidden = isHidden;
      }
      const { data } = await apiClient.patch(`/departments/${department.id}`, body);
      toast.success(data.message || 'Saved');
      await onSaved();
    } catch (e: unknown) {
      toast.error(apiMessage(e) || 'Could not save the department');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">{department.name}</h2>
            <p className="text-[11px] text-gray-500">/departments/{department.slug}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
        </div>

        {canAdmin && (
          <label className="mt-4 block">
            <span className="block text-xs font-semibold text-gray-600">Department name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="mt-1 block text-[11px] text-gray-500">What the card on the landing page says. The web address stays as it is.</span>
          </label>
        )}

        <label className="mt-3 block">
          <span className="block text-xs font-semibold text-gray-600">Page title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            placeholder={department.name}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <span className="mt-1 block text-[11px] text-gray-500">The headline at the top of the department&apos;s own page.</span>
        </label>

        <label className="mt-3 block">
          <span className="block text-xs font-semibold text-gray-600">Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {canAdmin && (
          <>
            <label className="mt-3 block">
              <span className="block text-xs font-semibold text-gray-600">Chair head</span>
              <select
                value={chairHeadId}
                onChange={(e) => setChairHeadId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Nobody — only admin and HOD can curate it</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email} — {p.approvedRole}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-gray-500">
                Changing this hands the page to someone else. What is already on it stays.
              </span>
            </label>

            <label className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
              <input type="checkbox" className="mt-0.5" checked={!isHidden} onChange={(e) => setIsHidden(!e.target.checked)} />
              <span className="text-xs text-gray-700">
                <strong className="font-semibold">Show on the website.</strong>{' '}
                The card appears on the landing page and anyone can open the page.
              </span>
            </label>
          </>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="mr-auto inline-flex items-center gap-1.5 rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <FiTrash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  return (
    <ProtectedRoute requiredRoles={ROLES}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
