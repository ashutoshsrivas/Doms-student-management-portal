'use client';

// Admin view: list of assignable users on the left, the selected user's
// tasks + private notes on the right.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiPlus, FiX, FiCheck, FiTrash2, FiAlertCircle, FiRefreshCw,
  FiDownload, FiCalendar, FiFileText, FiLock, FiEdit2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

interface FacultyRow {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    approvedRole: string;
    department?: string;
  };
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  status: 'PENDING' | 'COMPLETED';
  completedAt?: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  createdAt: string;
  Assignee?: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    approvedRole: string;
  };
  Assigner?: { id: string; firstName: string; lastName: string | null; email: string };
}

interface FacultyNote {
  id: string;
  facultyId: string;
  note: string;
  createdAt: string;
  Creator?: { id: string; firstName: string; lastName: string | null; email: string };
}

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : '—');
const fmtDateShort = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : '—');

export default function AdminFacultyTasksPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState<FacultyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [notes, setNotes] = useState<FacultyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Assign modal state
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadline: '' });
  const [creating, setCreating] = useState(false);

  // Note inputs
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Search filter
  const [search, setSearch] = useState('');

  // Role gate
  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, router]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/faculty-tasks/summary');
      const rows = (res.data.faculty || []) as FacultyRow[];
      setFaculty(rows);
      setSelectedId((prev) => prev || rows[0]?.user.id || '');
    } catch (e) {
      console.error(e);
      toast.error('Failed to load faculty list');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async (facultyId: string) => {
    if (!facultyId) return;
    setTasksLoading(true);
    try {
      const res = await apiClient.get('/faculty-tasks', { params: { assigneeId: facultyId } });
      setTasks(res.data.tasks || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async (facultyId: string) => {
    if (!facultyId) return;
    setNotesLoading(true);
    try {
      const res = await apiClient.get('/faculty-notes', { params: { facultyId } });
      setNotes(res.data.notes || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    if (selectedId) {
      loadTasks(selectedId);
      loadNotes(selectedId);
    }
  }, [selectedId, loadTasks, loadNotes]);

  const selected = faculty.find((f) => f.user.id === selectedId) || null;

  // === Actions ===
  const handleAssign = async () => {
    if (!selectedId) return;
    const title = form.title.trim();
    if (!title) { toast.error('Title is required'); return; }
    setCreating(true);
    try {
      await apiClient.post('/faculty-tasks', {
        assigneeId: selectedId,
        title,
        description: form.description.trim() || null,
        deadline: form.deadline || null,
      });
      toast.success('Task assigned');
      setShowAssign(false);
      setForm({ title: '', description: '', deadline: '' });
      loadSummary();
      loadTasks(selectedId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await apiClient.delete(`/faculty-tasks/${id}`);
      toast.success('Task deleted');
      loadSummary();
      loadTasks(selectedId);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleReopenTask = async (id: string) => {
    try {
      await apiClient.patch(`/faculty-tasks/${id}/reopen`);
      toast.success('Task reopened');
      loadSummary();
      loadTasks(selectedId);
    } catch {
      toast.error('Failed to reopen');
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      await apiClient.patch(`/faculty-tasks/${id}/complete`);
      toast.success('Marked done');
      loadSummary();
      loadTasks(selectedId);
    } catch {
      toast.error('Failed to mark done');
    }
  };

  // Notes
  const handleAddNote = async () => {
    if (!selectedId) return;
    const text = newNote.trim();
    if (!text) return;
    setAddingNote(true);
    try {
      await apiClient.post('/faculty-notes', { facultyId: selectedId, note: text });
      setNewNote('');
      loadNotes(selectedId);
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const startEditNote = (n: FacultyNote) => {
    setEditingNoteId(n.id);
    setEditingNoteText(n.note);
  };
  const cancelEditNote = () => { setEditingNoteId(null); setEditingNoteText(''); };
  const saveEditNote = async () => {
    if (!editingNoteId) return;
    const text = editingNoteText.trim();
    if (!text) return;
    try {
      await apiClient.patch(`/faculty-notes/${editingNoteId}`, { note: text });
      cancelEditNote();
      loadNotes(selectedId);
    } catch {
      toast.error('Failed to save note');
    }
  };
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await apiClient.delete(`/faculty-notes/${id}`);
      loadNotes(selectedId);
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const filteredFaculty = faculty.filter((f) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = `${f.user.firstName} ${f.user.lastName || ''}`.toLowerCase();
    return name.includes(q) || f.user.email.toLowerCase().includes(q) || (f.user.department || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <DashboardLayout title="Faculty Tasks">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Faculty Tasks">
      <div className="py-6 px-2 md:px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Faculty Tasks</h1>
            <p className="text-gray-600 mt-1 text-sm">Assign tasks to faculty, track their progress, and keep private notes.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
          >
            <FiArrowLeft /> Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: faculty list */}
          <aside className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search faculty…"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-500"
              />
            </div>
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
              {filteredFaculty.length === 0 ? (
                <li className="p-4 text-sm text-gray-500 italic">No faculty match.</li>
              ) : (
                filteredFaculty.map((f) => {
                  const isActive = f.user.id === selectedId;
                  return (
                    <li key={f.user.id}>
                      <button
                        onClick={() => setSelectedId(f.user.id)}
                        className={`w-full text-left px-3 py-3 transition ${isActive ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                      >
                        <div className="font-semibold text-gray-900 text-sm">
                          {f.user.firstName} {f.user.lastName || ''}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">{f.user.approvedRole}{f.user.department ? ` · ${f.user.department}` : ''}</div>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-semibold">
                            {f.pendingCount} pending
                          </span>
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">
                            {f.completedCount} done
                          </span>
                          {f.overdueCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">
                              {f.overdueCount} overdue
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          {/* Right: selected faculty's tasks + notes */}
          <main className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
                <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
                Pick a faculty from the list to view their tasks.
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selected.user.firstName} {selected.user.lastName || ''}
                    </h2>
                    <p className="text-sm text-gray-600">{selected.user.email} · <span className="font-semibold">{selected.user.approvedRole}</span>{selected.user.department ? ` · ${selected.user.department}` : ''}</p>
                  </div>
                  <button
                    onClick={() => setShowAssign(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm"
                  >
                    <FiPlus /> Assign Task
                  </button>
                </div>

                {/* Tasks */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Tasks</h3>
                    <span className="text-xs text-gray-500">
                      {selected.pendingCount} pending · {selected.completedCount} completed
                    </span>
                  </div>

                  {tasksLoading ? (
                    <p className="p-4 text-sm text-gray-500">Loading tasks…</p>
                  ) : tasks.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 italic">No tasks assigned yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {tasks.map((t) => {
                        const overdue = t.status === 'PENDING' && t.deadline && new Date(t.deadline).getTime() < Date.now();
                        return (
                          <li key={t.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-gray-900">{t.title}</h4>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {t.status === 'COMPLETED' ? 'COMPLETED' : (overdue ? 'OVERDUE' : 'PENDING')}
                                  </span>
                                </div>
                                {t.description && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{t.description}</p>}
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                                  {t.deadline && (
                                    <span className="inline-flex items-center gap-1">
                                      <FiCalendar /> Deadline: {fmtDateShort(t.deadline)}
                                    </span>
                                  )}
                                  <span>Assigned: {fmtDate(t.createdAt)}</span>
                                  {t.completedAt && <span>Completed: {fmtDate(t.completedAt)}</span>}
                                </div>
                                {t.documentUrl && (
                                  <a
                                    href={t.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-700 hover:underline"
                                  >
                                    <FiFileText /> {t.documentName || 'Supporting document'} <FiDownload size={12} />
                                  </a>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                {t.status === 'PENDING' ? (
                                  <button
                                    onClick={() => handleMarkDone(t.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-green-50 hover:bg-green-100 text-green-700"
                                    title="Mark as done (admin override)"
                                  >
                                    <FiCheck /> Mark done
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReopenTask(t.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                                  >
                                    <FiRefreshCw /> Reopen
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-red-50 hover:bg-red-100 text-red-700"
                                >
                                  <FiTrash2 /> Delete
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Private notes */}
                <div className="bg-white border-2 border-amber-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
                    <FiLock className="text-amber-700" />
                    <h3 className="font-bold text-amber-900">Admin Notes (private)</h3>
                    <span className="text-xs text-amber-800 ml-2">Only visible to admins. The faculty member never sees these.</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-stretch gap-2 mb-4">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a private note about this faculty member…"
                        rows={2}
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={addingNote || !newNote.trim()}
                        className="px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-semibold rounded-lg text-sm flex items-center gap-2"
                      >
                        <FiPlus /> Add
                      </button>
                    </div>

                    {notesLoading ? (
                      <p className="text-sm text-gray-500">Loading…</p>
                    ) : notes.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No notes yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {notes.map((n) => (
                          <li key={n.id} className="bg-amber-50 border border-amber-200 rounded p-3">
                            {editingNoteId === n.id ? (
                              <>
                                <textarea
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg text-sm text-gray-900"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button onClick={saveEditNote} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold">Save</button>
                                  <button onClick={cancelEditNote} className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs font-semibold">Cancel</button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-gray-900 whitespace-pre-wrap">{n.note}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-600">
                                    {n.Creator ? `${n.Creator.firstName} ${n.Creator.lastName || ''}` : '—'} · {fmtDate(n.createdAt)}
                                  </span>
                                  <div className="flex gap-1">
                                    <button onClick={() => startEditNote(n)} className="p-1 hover:bg-amber-100 rounded text-amber-700" title="Edit">
                                      <FiEdit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteNote(n.id)} className="p-1 hover:bg-red-100 rounded text-red-700" title="Delete">
                                      <FiTrash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Assign-task modal */}
      {showAssign && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold">Assign Task to {selected.user.firstName}</h3>
              <button onClick={() => setShowAssign(false)} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Prepare placement report for Aug"
                  maxLength={250}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Deadline (optional)</label>
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setShowAssign(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={handleAssign}
                disabled={creating || !form.title.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold"
              >
                {creating ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
