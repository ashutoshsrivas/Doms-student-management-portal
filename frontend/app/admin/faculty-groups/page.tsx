'use client';

// Admin: manage Faculty Groups — saved bundles of assignable users that
// can be targeted as a single unit from the Faculty Tasks page (either
// COPY mode — each member gets an independent task — or SHARED mode —
// every member sees the same task, completion cascades).

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiPlus, FiX, FiTrash2, FiEdit2, FiUsers, FiSave,
  FiUserPlus, FiUserMinus, FiAlertCircle, FiSearch,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  approvedRole: string;
  department?: string;
}

interface Member {
  id: string;          // FacultyGroupMember row id
  userId: string;
  User?: AssignableUser;
}

interface Group {
  id: string;
  name: string;
  description?: string | null;
  Members: Member[];
  Creator?: { id: string; firstName: string; lastName: string | null; email: string };
  createdAt: string;
}

const fullName = (u?: { firstName: string; lastName: string | null } | null) =>
  u ? `${u.firstName} ${u.lastName || ''}`.trim() : '';

export default function AdminFacultyGroupsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pool, setPool] = useState<AssignableUser[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  // Create-group modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{ name: string; description: string; memberIds: Set<string> }>({
    name: '', description: '', memberIds: new Set(),
  });
  const [creating, setCreating] = useState(false);

  // Rename modal
  const [renaming, setRenaming] = useState<Group | null>(null);
  const [renameDraft, setRenameDraft] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [savingName, setSavingName] = useState(false);

  // Member-picker for right pane "add member"
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, sRes] = await Promise.all([
        apiClient.get('/faculty-groups'),
        apiClient.get('/faculty-tasks/summary'),
      ]);
      const gs = (gRes.data.groups || []) as Group[];
      setGroups(gs);
      setSelectedId((prev) => prev || gs[0]?.id || '');
      // Pool of assignable users comes from the summary endpoint (same role filter)
      const summary = (sRes.data.faculty || []) as Array<{ user: AssignableUser }>;
      setPool(summary.map((s) => s.user));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = groups.find((g) => g.id === selectedId) || null;

  // === Create ===
  const handleCreate = async () => {
    const name = form.name.trim();
    if (!name) { toast.error('Name is required'); return; }
    setCreating(true);
    try {
      const res = await apiClient.post('/faculty-groups', {
        name,
        description: form.description.trim() || null,
        memberIds: Array.from(form.memberIds),
      });
      toast.success('Group created');
      setShowCreate(false);
      setForm({ name: '', description: '', memberIds: new Set() });
      const created = res.data.group as Group;
      // Refetch and select the new one
      await load();
      setSelectedId(created.id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  // === Rename ===
  const openRename = (g: Group) => {
    setRenaming(g);
    setRenameDraft({ name: g.name, description: g.description || '' });
  };
  const handleRename = async () => {
    if (!renaming) return;
    const name = renameDraft.name.trim();
    if (!name) { toast.error('Name cannot be empty'); return; }
    setSavingName(true);
    try {
      await apiClient.patch(`/faculty-groups/${renaming.id}`, {
        name,
        description: renameDraft.description.trim() || null,
      });
      toast.success('Group updated');
      setRenaming(null);
      load();
    } catch { toast.error('Failed to save'); }
    finally { setSavingName(false); }
  };

  // === Delete ===
  const handleDelete = async (g: Group) => {
    if (!confirm(`Delete group "${g.name}"?\n\nTasks already assigned via this group keep working (independent rows). Only the group itself is removed.`)) return;
    try {
      await apiClient.delete(`/faculty-groups/${g.id}`);
      toast.success('Group deleted');
      if (selectedId === g.id) setSelectedId('');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  // === Members ===
  const handleAddMember = async (userId: string) => {
    if (!selected) return;
    try {
      await apiClient.post(`/faculty-groups/${selected.id}/members`, { userId });
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };
  const handleRemoveMember = async (userId: string) => {
    if (!selected) return;
    try {
      await apiClient.delete(`/faculty-groups/${selected.id}/members/${userId}`);
      load();
    } catch { toast.error('Failed to remove'); }
  };

  const memberIdSet = useMemo(() => new Set(selected?.Members.map((m) => m.userId) || []), [selected]);
  const candidatePool = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return pool.filter((u) => {
      if (memberIdSet.has(u.id)) return false;
      if (!q) return true;
      const n = `${u.firstName} ${u.lastName || ''}`.toLowerCase();
      return n.includes(q) || u.email.toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q);
    });
  }, [pool, memberIdSet, memberSearch]);

  if (loading) {
    return (
      <DashboardLayout title="Faculty Groups">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Faculty Groups">
      <div className="py-6 px-2 md:px-4 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Faculty Groups</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Bundle multiple faculty/HOD/coordinator/trainer/mentor users so you can assign a single
              task to all of them at once — either as independent copies or as a single shared task.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm"
            >
              <FiPlus /> New Group
            </button>
            <button
              onClick={() => router.push('/admin/faculty-tasks')}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
            >
              <FiArrowLeft /> Tasks
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: group list */}
          <aside className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-xs uppercase font-semibold text-gray-600">
              All Groups ({groups.length})
            </div>
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
              {groups.length === 0 ? (
                <li className="p-4 text-sm text-gray-500 italic">No groups yet — create one to get started.</li>
              ) : (
                groups.map((g) => {
                  const isActive = g.id === selectedId;
                  return (
                    <li key={g.id}>
                      <button
                        onClick={() => setSelectedId(g.id)}
                        className={`w-full text-left px-3 py-3 transition ${isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                      >
                        <div className="font-semibold text-gray-900 text-sm">{g.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                          <FiUsers size={12} /> {g.Members.length} member{g.Members.length === 1 ? '' : 's'}
                        </div>
                        {g.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{g.description}</div>}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          {/* Right: detail */}
          <main className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
                <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
                Pick a group from the list to manage its members.
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                      {selected.description && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selected.description}</p>}
                      <p className="text-xs text-gray-500 mt-2">
                        Created by {fullName(selected.Creator)} · {new Date(selected.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openRename(selected)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-700"
                      >
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selected)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-red-50 hover:bg-red-100 text-red-700"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current members */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <FiUsers /> Members ({selected.Members.length})
                    </h3>
                  </div>
                  {selected.Members.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 italic">No members yet — pick from the candidate list below.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {selected.Members.map((m) => (
                        <li key={m.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{fullName(m.User)}</p>
                            <p className="text-xs text-gray-600 truncate">{m.User?.email} · {m.User?.approvedRole}{m.User?.department ? ` · ${m.User.department}` : ''}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="ml-3 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-red-50 hover:bg-red-100 text-red-700 shrink-0"
                          >
                            <FiUserMinus size={12} /> Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Add members */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <FiUserPlus /> Add members
                    </h3>
                    <div className="relative flex-1 max-w-sm">
                      <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search…"
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  {candidatePool.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 italic">No matching users.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
                      {candidatePool.map((u) => (
                        <li key={u.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{fullName(u)}</p>
                            <p className="text-xs text-gray-600 truncate">{u.email} · {u.approvedRole}{u.department ? ` · ${u.department}` : ''}</p>
                          </div>
                          <button
                            onClick={() => handleAddMember(u.id)}
                            className="ml-3 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-green-50 hover:bg-green-100 text-green-700 shrink-0"
                          >
                            <FiUserPlus size={12} /> Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold">New Faculty Group</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. CSE Mentors 2026"
                  maxLength={200}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Initial members ({form.memberIds.size} selected)
                </label>
                <div className="border-2 border-gray-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {pool.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 italic">No assignable users found.</p>
                  ) : (
                    pool.map((u) => {
                      const checked = form.memberIds.has(u.id);
                      return (
                        <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setForm((p) => {
                              const next = new Set(p.memberIds);
                              if (checked) next.delete(u.id); else next.add(u.id);
                              return { ...p, memberIds: next };
                            })}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{fullName(u)}</p>
                            <p className="text-xs text-gray-600 truncate">{u.email} · {u.approvedRole}{u.department ? ` · ${u.department}` : ''}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold flex items-center gap-2"
              >
                <FiSave /> {creating ? 'Creating…' : 'Create group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renaming && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold">Edit Group</h3>
              <button onClick={() => setRenaming(null)} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Name *</label>
                <input
                  type="text"
                  value={renameDraft.name}
                  onChange={(e) => setRenameDraft((p) => ({ ...p, name: e.target.value }))}
                  maxLength={200}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description (optional)</label>
                <textarea
                  value={renameDraft.description}
                  onChange={(e) => setRenameDraft((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setRenaming(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={handleRename}
                disabled={savingName || !renameDraft.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold"
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
