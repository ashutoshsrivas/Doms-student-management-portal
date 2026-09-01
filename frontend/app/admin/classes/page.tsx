'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiPlus, FiSearch, FiUsers, FiUser, FiCalendar, FiChevronDown, FiChevronUp,
  FiTrash2, FiEdit2, FiFileText, FiCheck, FiX,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useAuthStore from '@/app/store/authStore';

type Student = { id: string; firstName: string | null; lastName: string | null; email: string };
type Coordinator = Student & { approvedRole: string };
type Session = { id: string; name: string };
type Representative = { id: string; studentId: string; Student: Student | null };
type ClassRow = {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  coordinatorId: string;
  status: string;
  Session: Session | null;
  Coordinator: Coordinator | null;
  Representatives: Representative[];
};
type AttendanceRow = {
  id: string;
  classId: string;
  date: string;
  classTiming?: string;
  additionalInfo?: string;
  presentCount: number;
  bunkedCount: number;
  leaveCount: number;
  submittedAt: string;
  submitter: { id: string; name: string } | null;
  hasATR: boolean;
  actionTakenReport?: string | null;
  atrAt?: string | null;
  atrAuthor?: { id: string; name: string } | null;
};

const nameOf = (u: Student | Coordinator | null) =>
  u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : '—';

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

function Content() {
  const { user } = useAuthStore();
  const isAdmin = ['ADMIN', 'HOD'].includes(user?.role || '');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [editingCRs, setEditingCRs] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [sRes, cRes] = await Promise.all([
          apiClient.get('/sessions?page=1&limit=100'),
          apiClient.get('/classes', { params: sessionId ? { sessionId } : {} }),
        ]);
        setSessions(sRes.data.sessions || []);
        setClasses(cRes.data.classes || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => {
      const n = c.name.toLowerCase();
      const s = (c.Session?.name || '').toLowerCase();
      const co = nameOf(c.Coordinator).toLowerCase();
      return n.includes(q) || s.includes(q) || co.includes(q);
    });
  }, [classes, query]);

  const refresh = async () => {
    const cRes = await apiClient.get('/classes', { params: sessionId ? { sessionId } : {} });
    setClasses(cRes.data.classes || []);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete class "${name}"? This removes all attendance records.`)) return;
    try {
      await apiClient.delete(`/classes/${id}`);
      toast.success('Class deleted');
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sections inside an academic session. Each has one coordinator and up to 4 Class Representatives (CRs).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search class, session, coordinator…"
              className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <FiPlus className="h-4 w-4" /> New Class
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          {classes.length === 0 && isAdmin
            ? 'No classes yet. Create your first with the "New Class" button.'
            : 'No classes match your filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isOpen ? <FiChevronUp className="h-4 w-4 text-gray-400" /> : <FiChevronDown className="h-4 w-4 text-gray-400" />}
                      <h3 className="text-base font-bold text-gray-900 truncate">{c.name}</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {c.Session?.name || '—'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 pl-6 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <FiUser className="h-3 w-3" /> {nameOf(c.Coordinator)}
                        {c.Coordinator?.approvedRole && (
                          <span className="text-gray-400"> · {c.Coordinator.approvedRole}</span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FiUsers className="h-3 w-3" /> {c.Representatives.length}/4 CRs
                      </span>
                    </div>
                  </div>
                  {(isAdmin || c.coordinatorId === user?.id) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setEditingClass(c); }}
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                        title="Edit class"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </span>
                      {isAdmin && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          title="Delete class"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                    {c.description && (
                      <div className="text-sm text-gray-700">{c.description}</div>
                    )}
                    <CRList
                      cls={c}
                      canEdit={isAdmin || c.coordinatorId === user?.id}
                      editing={editingCRs === c.id}
                      onEditStart={() => setEditingCRs(c.id)}
                      onEditEnd={() => setEditingCRs(null)}
                      onSaved={refresh}
                    />
                    <AttendancePanel
                      cls={c}
                      canWriteATR={isAdmin || c.coordinatorId === user?.id}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <CreateClassModal
          sessions={sessions}
          defaultSessionId={sessionId}
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      {editingClass && (
        <EditClassModal
          cls={editingClass}
          canChangeCoordinator={isAdmin}
          onClose={() => setEditingClass(null)}
          onSaved={async () => {
            setEditingClass(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function CRList({
  cls, canEdit, editing, onEditStart, onEditEnd, onSaved,
}: {
  cls: ClassRow;
  canEdit: boolean;
  editing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onSaved: () => Promise<void>;
}) {
  const [candidates, setCandidates] = useState<Student[]>([]);
  const [selected, setSelected] = useState<string[]>(cls.Representatives.map((r) => r.studentId));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!editing) return;
    setSearch('');
    (async () => {
      try {
        // Scoped to the class's session so faculty coordinators only see
        // students enrolled in that session (much shorter list). Falls back
        // gracefully if the endpoint returns nothing.
        const res = await apiClient.get('/classes/eligible-crs', {
          params: { sessionId: cls.sessionId },
        });
        const list = (res.data?.users || []) as any[];
        setCandidates(list.map((u: any) => ({
          id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email,
        })));
      } catch {
        setCandidates([]);
      }
    })();
  }, [editing, cls.sessionId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        toast.error('A class can have at most 4 CRs');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Filter candidates by name or email. Always keep the currently-selected
  // rows visible at the top so the user can un-select them even after typing.
  const visibleCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? candidates.filter((s) => {
          const n = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
          return n.includes(q) || (s.email || '').toLowerCase().includes(q);
        })
      : candidates;
    // Move selected to the top so they don't disappear from the list.
    const sel = new Set(selected);
    return [
      ...filtered.filter((s) => sel.has(s.id)),
      ...filtered.filter((s) => !sel.has(s.id)),
    ];
  }, [candidates, search, selected]);

  const save = async () => {
    try {
      setSaving(true);
      await apiClient.put(`/classes/${cls.id}/crs`, { studentIds: selected });
      toast.success('CRs updated');
      await onSaved();
      onEditEnd();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save CRs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Class Representatives</div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={onEditStart}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            <FiEdit2 className="h-3 w-3" /> Edit CRs
          </button>
        )}
      </div>
      {!editing ? (
        cls.Representatives.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No CRs assigned.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cls.Representatives.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-1 text-xs text-blue-800">
                <FiUser className="h-3 w-3" /> {nameOf(r.Student)}
              </span>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-gray-500">
              Selected {selected.length}/4. Click to add or remove.
            </div>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FiSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                autoFocus
                className="w-full rounded border border-gray-300 bg-white py-1.5 pl-7 pr-2 text-xs text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
            {candidates.length === 0 ? (
              <div className="text-sm text-gray-500">No student users found.</div>
            ) : visibleCandidates.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No students match &ldquo;{search}&rdquo;.</div>
            ) : (
              visibleCandidates.map((s) => {
                const chosen = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${
                      chosen ? 'bg-blue-100 text-blue-900' : 'hover:bg-white text-gray-800'
                    }`}
                  >
                    <span>{nameOf(s)} <span className="text-xs text-gray-500">{s.email}</span></span>
                    {chosen && <FiCheck className="h-4 w-4 text-blue-600" />}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onEditEnd} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendancePanel({ cls, canWriteATR }: { cls: ClassRow; canWriteATR: boolean }) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingATR, setEditingATR] = useState<string | null>(null);
  const [atrDraft, setATRDraft] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/classes/${cls.id}/attendance`);
      setRows(res.data.attendance || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cls.id]);

  const saveATR = async (attId: string) => {
    try {
      await apiClient.patch(`/classes/${cls.id}/attendance/${attId}/atr`, {
        actionTakenReport: atrDraft,
      });
      toast.success('Action Taken Report saved');
      setEditingATR(null);
      setATRDraft('');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save ATR');
    }
  };

  // Group by date, newest date first, then by class timing within a date.
  const grouped = (() => {
    const map = new Map<string, AttendanceRow[]>();
    for (const r of rows) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([d, list]) => [d, [...list].sort((x, y) => (x.classTiming || '').localeCompare(y.classTiming || ''))] as const);
  })();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1">
          <FiCalendar className="h-3 w-3" /> Daily Attendance
        </div>
        {canWriteATR && (
          <span className="text-[10px] text-gray-400">ATR visible only to ADMIN, HOD and this class's coordinator</span>
        )}
      </div>
      {loading ? (
        <div className="py-4 text-center text-sm text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-4 text-center text-sm text-gray-500 italic">No attendance punched yet.</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([d, list]) => (
            <div key={d} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b border-gray-100">
                <FiCalendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">{fmt(d)}</span>
                <span className="text-[11px] text-gray-500">· {list.length} {list.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Class Timing</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Present</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Skipped</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Leave</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Info</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Submitted by</th>
                      {canWriteATR && <th className="px-3 py-2 text-left font-semibold text-gray-700">ATR</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((r) => {
                      const isEditing = editingATR === r.id;
                      return (
                        <tr key={r.id} className="align-top">
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.classTiming?.trim() ? r.classTiming : <span className="text-gray-400 italic">—</span>}</td>
                          <td className="px-3 py-2 text-emerald-700 font-semibold">{r.presentCount}</td>
                          <td className="px-3 py-2 text-red-700 font-semibold">{r.bunkedCount}</td>
                          <td className="px-3 py-2 text-amber-700 font-semibold">{r.leaveCount}</td>
                          <td className="px-3 py-2 text-xs text-gray-600 max-w-[220px] whitespace-pre-wrap break-words">{r.additionalInfo?.trim() ? r.additionalInfo : <span className="text-gray-400 italic">—</span>}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {r.submitter?.name || '—'}
                            <div className="text-[10px] text-gray-400">{fmt(r.submittedAt)}</div>
                          </td>
                          {canWriteATR && (
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <textarea
                                    value={atrDraft}
                                    onChange={(e) => setATRDraft(e.target.value)}
                                    rows={3}
                                    placeholder="Describe the action taken…"
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                  />
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => saveATR(r.id)} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-700">
                                      <FiCheck className="h-3 w-3" /> Save
                                    </button>
                                    <button type="button" onClick={() => { setEditingATR(null); setATRDraft(''); }} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                                      <FiX className="h-3 w-3" /> Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : r.actionTakenReport ? (
                                <div className="max-w-md">
                                  <div className="whitespace-pre-wrap rounded border border-indigo-100 bg-indigo-50 px-2 py-1.5 text-xs text-indigo-900">
                                    {r.actionTakenReport}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                                    <span>by {r.atrAuthor?.name || '—'} · {fmt(r.atrAt)}</span>
                                    <button type="button" onClick={() => { setEditingATR(r.id); setATRDraft(r.actionTakenReport || ''); }} className="text-blue-700 hover:text-blue-900 font-semibold">
                                      Edit
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button type="button" onClick={() => { setEditingATR(r.id); setATRDraft(''); }} className="inline-flex items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                                  <FiFileText className="h-3 w-3" /> Add ATR
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateClassModal({
  sessions, defaultSessionId, onClose, onCreated,
}: {
  sessions: Session[];
  defaultSessionId: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sessionId, setSessionId] = useState(defaultSessionId || sessions[0]?.id || '');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [coords, setCoords] = useState<Coordinator[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/classes/eligible-coordinators');
        setCoords(res.data.users || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load coordinators');
      }
    })();
  }, []);

  const save = async () => {
    if (!sessionId || !name.trim() || !coordinatorId) {
      toast.error('Session, name, and coordinator are required');
      return;
    }
    try {
      setSaving(true);
      await apiClient.post('/classes', {
        sessionId, name: name.trim(), description: description.trim() || null, coordinatorId,
      });
      toast.success('Class created');
      await onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">New Class / Section</h2>
        <p className="text-xs text-gray-500 mt-1">CRs can be added after creation.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Session *</label>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900">
              <option value="">Select session</option>
              {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Class name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MBA Marketing — Section A" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Class coordinator *</label>
            <select value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900">
              <option value="">Select coordinator</option>
              {coords.map((c) => (
                <option key={c.id} value={c.id}>{nameOf(c)} — {c.approvedRole}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">Eligible: FACULTY, CHAIR_HEAD, PLACEMENT_COORDINATOR, COORDINATOR.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditClassModal({
  cls, canChangeCoordinator, onClose, onSaved,
}: {
  cls: ClassRow;
  canChangeCoordinator: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(cls.name);
  const [description, setDescription] = useState(cls.description || '');
  const [status, setStatus] = useState(cls.status || 'ACTIVE');
  const [coordinatorId, setCoordinatorId] = useState(cls.coordinatorId);
  const [coords, setCoords] = useState<Coordinator[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canChangeCoordinator) return;
    (async () => {
      try {
        const res = await apiClient.get('/classes/eligible-coordinators');
        const list = (res.data.users || []) as Coordinator[];
        // Keep the current coordinator selectable even if they no longer show
        // up in the eligible list (e.g. role changed).
        if (cls.Coordinator && !list.some((u) => u.id === cls.Coordinator!.id)) {
          list.unshift(cls.Coordinator as Coordinator);
        }
        setCoords(list);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load coordinators');
      }
    })();
  }, [canChangeCoordinator, cls.Coordinator]);

  const save = async () => {
    if (!name.trim()) {
      toast.error('Class name is required');
      return;
    }
    if (canChangeCoordinator && !coordinatorId) {
      toast.error('A coordinator is required');
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        status,
      };
      // Only ADMIN/HOD may send coordinatorId — the backend rejects it otherwise.
      if (canChangeCoordinator) body.coordinatorId = coordinatorId;
      await apiClient.patch(`/classes/${cls.id}`, body);
      toast.success('Class updated');
      await onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Edit Class / Section</h2>
        <p className="text-xs text-gray-500 mt-1">
          Session: <span className="font-semibold">{cls.Session?.name || '—'}</span> · CRs are managed from the class panel.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Class name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MBA Marketing — Section A" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          {canChangeCoordinator && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Class coordinator *</label>
              <select value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900">
                <option value="">Select coordinator</option>
                {coords.map((c) => (
                  <option key={c.id} value={c.id}>{nameOf(c)}{c.approvedRole ? ` — ${c.approvedRole}` : ''}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">Eligible: FACULTY, CHAIR_HEAD, PLACEMENT_COORDINATOR, COORDINATOR.</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900">
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
