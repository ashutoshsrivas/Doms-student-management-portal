'use client';

// Admin view: faculty list (left) + selected faculty's task TIMELINE +
// private admin notes (right). Tasks render as a vertical, date-grouped
// timeline with priority-colored dots. Each task has an inline admin
// remark editor. A "Download Report" button in the header pulls the full
// JSON report from /api/faculty-tasks/report and pipes it through the
// shared exportToExcel / exportToPDF helpers — same pattern as
// /admin/reports.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiPlus, FiX, FiCheck, FiTrash2, FiAlertCircle, FiRefreshCw,
  FiDownload, FiCalendar, FiFileText, FiLock, FiEdit2, FiFlag,
  FiMessageSquare, FiSave, FiLoader, FiClock, FiUsers, FiZap,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import { exportToExcel, exportToPDF, type ReportPayload } from '@/app/lib/reportExports';

// ============ Types & constants ============

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const PRIORITY_OPTIONS: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const PRIORITY_STYLE: Record<Priority, {
  chip: string;       // for inline pill
  dot: string;        // timeline dot bg
  ring: string;       // ring around dot
  pickerActive: string; // active state in picker
  label: string;
}> = {
  URGENT: { chip: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-600', ring: 'ring-red-200', pickerActive: 'bg-red-600 text-white border-red-700', label: 'Urgent' },
  HIGH:   { chip: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500', ring: 'ring-orange-200', pickerActive: 'bg-orange-500 text-white border-orange-600', label: 'High' },
  MEDIUM: { chip: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500', ring: 'ring-blue-200', pickerActive: 'bg-blue-600 text-white border-blue-700', label: 'Medium' },
  LOW:    { chip: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400', ring: 'ring-gray-200', pickerActive: 'bg-gray-700 text-white border-gray-800', label: 'Low' },
};

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
  lateSubmittedCount: number;
  accuracy: number | null;
  evaluableCount: number;
}

interface FacultyGroupLite {
  id: string;
  name: string;
  Members: { userId: string }[];
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  status: 'PENDING' | 'COMPLETED';
  priority: Priority;
  completedAt?: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  createdAt: string;
  adminRemark?: string | null;
  remarkedAt?: string | null;
  groupTaskId?: string | null;
  sharedCompletion?: boolean;
  submittedLate?: boolean;
  Assignee?: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    approvedRole: string;
  };
  Assigner?: { id: string; firstName: string; lastName: string | null; email: string };
  Remarker?: { id: string; firstName: string; lastName: string | null; email: string };
}

interface FacultyNote {
  id: string;
  facultyId: string;
  note: string;
  createdAt: string;
  Creator?: { id: string; firstName: string; lastName: string | null; email: string };
}

// ============ Helpers ============

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : '—');
const fmtDateShort = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : '—');
const fmtTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

// Date-only key for grouping (local TZ)
const dayKey = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const prettyDay = (key: string) => {
  const d = new Date(`${key}T00:00:00`);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yest)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

// ============ Component ============

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
  const [form, setForm] = useState<{ title: string; description: string; deadline: string; priority: Priority }>({
    title: '', description: '', deadline: '', priority: 'MEDIUM',
  });
  const [creating, setCreating] = useState(false);

  // Edit-task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string; deadline: string; priority: Priority }>({
    title: '', description: '', deadline: '', priority: 'MEDIUM',
  });
  const [saving, setSaving] = useState(false);

  // Inline remark editor — keyed by task id; absent = closed
  const [remarkDraft, setRemarkDraft] = useState<Record<string, string>>({});
  const [savingRemarkId, setSavingRemarkId] = useState<string | null>(null);

  // Note inputs
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');

  // Report download state
  const [reportBusy, setReportBusy] = useState<null | 'xlsx' | 'pdf'>(null);

  // Bulk-assign modal + groups
  const [groups, setGroups] = useState<FacultyGroupLite[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState<{
    title: string;
    description: string;
    deadline: string;
    priority: Priority;
    mode: 'INDIVIDUAL' | 'SHARED';
    assigneeIds: Set<string>;
    groupIds: Set<string>;
  }>({
    title: '', description: '', deadline: '', priority: 'MEDIUM',
    mode: 'INDIVIDUAL', assigneeIds: new Set(), groupIds: new Set(),
  });
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');

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

  const loadGroups = useCallback(async () => {
    try {
      const res = await apiClient.get('/faculty-groups');
      const gs = (res.data.groups || []) as Array<FacultyGroupLite & { Members: Array<{ userId: string }> }>;
      setGroups(gs.map((g) => ({ id: g.id, name: g.name, Members: g.Members || [] })));
    } catch (e) {
      console.error(e);
      // Not fatal — bulk-assign just won't show groups
    }
  }, []);

  useEffect(() => { loadSummary(); loadGroups(); }, [loadSummary, loadGroups]);
  useEffect(() => {
    if (selectedId) {
      loadTasks(selectedId);
      loadNotes(selectedId);
    }
  }, [selectedId, loadTasks, loadNotes]);

  const selected = faculty.find((f) => f.user.id === selectedId) || null;

  // === Filtered + grouped tasks for timeline ===
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'PENDING' && t.status !== 'PENDING') return false;
      if (statusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter]);

  // Group by createdAt day; within each group, render in the order returned
  // by the API (URGENT first, then deadline asc).
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of visibleTasks) {
      const k = dayKey(t.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    // Newest day first
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [visibleTasks]);

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
        priority: form.priority,
      });
      toast.success('Task assigned');
      setShowAssign(false);
      setForm({ title: '', description: '', deadline: '', priority: 'MEDIUM' });
      loadSummary();
      loadTasks(selectedId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setEditForm({
      title: t.title,
      description: t.description || '',
      deadline: t.deadline ? t.deadline.slice(0, 16) : '',
      priority: t.priority,
    });
  };
  const handleSaveEdit = async () => {
    if (!editingTask) return;
    const title = editForm.title.trim();
    if (!title) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await apiClient.patch(`/faculty-tasks/${editingTask.id}`, {
        title,
        description: editForm.description.trim() || null,
        deadline: editForm.deadline || null,
        priority: editForm.priority,
      });
      toast.success('Task updated');
      setEditingTask(null);
      loadSummary();
      loadTasks(selectedId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
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

  // === Remark ===
  const handleSaveRemark = async (id: string) => {
    const draft = (remarkDraft[id] ?? '').trim();
    setSavingRemarkId(id);
    try {
      await apiClient.patch(`/faculty-tasks/${id}/remark`, { remark: draft });
      toast.success(draft ? 'Remark saved' : 'Remark cleared');
      // Clear local draft so the saved value re-renders
      setRemarkDraft((p) => { const n = { ...p }; delete n[id]; return n; });
      loadTasks(selectedId);
    } catch {
      toast.error('Failed to save remark');
    } finally {
      setSavingRemarkId(null);
    }
  };

  // === Bulk assign ===
  const resolvedAssigneeCount = useMemo(() => {
    const set = new Set<string>(bulkForm.assigneeIds);
    for (const gid of bulkForm.groupIds) {
      const g = groups.find((gg) => gg.id === gid);
      if (g) for (const m of g.Members) set.add(m.userId);
    }
    return set.size;
  }, [bulkForm.assigneeIds, bulkForm.groupIds, groups]);

  const handleBulkCreate = async () => {
    const title = bulkForm.title.trim();
    if (!title) { toast.error('Title is required'); return; }
    if (resolvedAssigneeCount === 0) { toast.error('Pick at least one faculty or group'); return; }
    setBulkCreating(true);
    try {
      const res = await apiClient.post('/faculty-tasks/bulk', {
        title,
        description: bulkForm.description.trim() || null,
        deadline: bulkForm.deadline || null,
        priority: bulkForm.priority,
        mode: bulkForm.mode,
        assigneeIds: Array.from(bulkForm.assigneeIds),
        groupIds: Array.from(bulkForm.groupIds),
      });
      const { created, mode } = res.data;
      toast.success(
        mode === 'SHARED'
          ? `Shared task created for ${created} faculty (completing one cascades to all)`
          : `Task copied to ${created} faculty (each independent)`
      );
      setShowBulk(false);
      setBulkForm({
        title: '', description: '', deadline: '', priority: 'MEDIUM',
        mode: 'INDIVIDUAL', assigneeIds: new Set(), groupIds: new Set(),
      });
      loadSummary();
      if (selectedId) loadTasks(selectedId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to bulk-assign');
    } finally {
      setBulkCreating(false);
    }
  };

  const bulkVisibleFaculty = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    if (!q) return faculty;
    return faculty.filter((f) => {
      const name = `${f.user.firstName} ${f.user.lastName || ''}`.toLowerCase();
      return name.includes(q) || f.user.email.toLowerCase().includes(q) || (f.user.department || '').toLowerCase().includes(q);
    });
  }, [faculty, bulkSearch]);

  // === Report ===
  const handleDownloadReport = async (format: 'xlsx' | 'pdf') => {
    setReportBusy(format);
    try {
      const res = await apiClient.get('/faculty-tasks/report');
      const payload = res.data as ReportPayload;
      if (format === 'xlsx') exportToExcel(payload);
      else exportToPDF(payload);
      toast.success('Report downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to download report');
    } finally {
      setReportBusy(null);
    }
  };

  // === Notes ===
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
  const startEditNote = (n: FacultyNote) => { setEditingNoteId(n.id); setEditingNoteText(n.note); };
  const cancelEditNote = () => { setEditingNoteId(null); setEditingNoteText(''); };
  const saveEditNote = async () => {
    if (!editingNoteId) return;
    const text = editingNoteText.trim();
    if (!text) return;
    try {
      await apiClient.patch(`/faculty-notes/${editingNoteId}`, { note: text });
      cancelEditNote();
      loadNotes(selectedId);
    } catch { toast.error('Failed to save note'); }
  };
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await apiClient.delete(`/faculty-notes/${id}`);
      loadNotes(selectedId);
    } catch { toast.error('Failed to delete note'); }
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
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Faculty Tasks</h1>
            <p className="text-gray-600 mt-1 text-sm">Assign tasks, track their timeline, leave remarks on submissions, and keep private notes.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => handleDownloadReport('xlsx')}
                disabled={!!reportBusy}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                title="Download Excel report of all tasks"
              >
                {reportBusy === 'xlsx' ? <FiLoader className="animate-spin" /> : <FiDownload />} Excel
              </button>
              <div className="w-px h-6 bg-gray-300" />
              <button
                onClick={() => handleDownloadReport('pdf')}
                disabled={!!reportBusy}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                title="Download PDF report of all tasks"
              >
                {reportBusy === 'pdf' ? <FiLoader className="animate-spin" /> : <FiDownload />} PDF
              </button>
            </div>
            <button
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm"
              title="Assign one task to multiple faculty or groups at once"
            >
              <FiZap /> Bulk Assign
            </button>
            <button
              onClick={() => router.push('/admin/faculty-groups')}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
            >
              <FiUsers /> Groups
            </button>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
            >
              <FiArrowLeft /> Back
            </button>
          </div>
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
                        <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
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
                          {f.lateSubmittedCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                              {f.lateSubmittedCount} late-subm
                            </span>
                          )}
                        </div>
                        {f.accuracy != null && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${f.accuracy >= 80 ? 'bg-green-500' : f.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${f.accuracy}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-700">{f.accuracy}%</span>
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          {/* Right: selected faculty's timeline + notes */}
          <main className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
                <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
                Pick a faculty from the list to view their tasks.
              </div>
            ) : (
              <>
                {/* Header card */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selected.user.firstName} {selected.user.lastName || ''}
                    </h2>
                    <p className="text-sm text-gray-600">{selected.user.email} · <span className="font-semibold">{selected.user.approvedRole}</span>{selected.user.department ? ` · ${selected.user.department}` : ''}</p>
                  </div>
                  {/* Accuracy card */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Accuracy</p>
                      {selected.accuracy != null ? (
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className={`text-2xl font-bold ${selected.accuracy >= 80 ? 'text-green-600' : selected.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {selected.accuracy}%
                          </span>
                          <span className="text-[10px] text-gray-500">({selected.evaluableCount} task{selected.evaluableCount === 1 ? '' : 's'})</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">— (no evaluable tasks)</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAssign(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm"
                    >
                      <FiPlus /> Assign Task
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Show:</span>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(['ALL', 'PENDING', 'COMPLETED'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1 text-xs font-semibold rounded ${statusFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {s === 'ALL' ? 'All' : s === 'PENDING' ? 'Pending' : 'Completed'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-2">Priority:</span>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded ${priorityFilter === p ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {p === 'ALL' ? 'All' : PRIORITY_STYLE[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Timeline</h3>
                    <span className="text-xs text-gray-500">
                      {visibleTasks.length} of {tasks.length} tasks
                    </span>
                  </div>

                  {tasksLoading ? (
                    <p className="p-6 text-sm text-gray-500">Loading tasks…</p>
                  ) : visibleTasks.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500 italic">No tasks match the current filters.</p>
                  ) : (
                    <div className="p-4 md:p-6">
                      {grouped.map(([day, dayTasks]) => (
                        <div key={day} className="mb-6 last:mb-0">
                          {/* Day header */}
                          <div className="flex items-center gap-2 mb-3 ml-1">
                            <FiCalendar className="text-gray-400" size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{prettyDay(day)}</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>

                          {/* Tasks in this day */}
                          <ol className="relative border-l-2 border-gray-200 ml-3 space-y-4">
                            {dayTasks.map((t) => {
                              const overdue = t.status === 'PENDING' && t.deadline && new Date(t.deadline).getTime() < Date.now();
                              const pStyle = PRIORITY_STYLE[t.priority];
                              const isRemarkOpen = remarkDraft[t.id] !== undefined;
                              const currentRemark = t.adminRemark || '';
                              const draftValue = remarkDraft[t.id] ?? currentRemark;

                              return (
                                <li key={t.id} className="ml-5 relative">
                                  {/* Timeline dot */}
                                  <span
                                    className={`absolute -left-[1.875rem] top-1 w-4 h-4 rounded-full ring-4 ${pStyle.dot} ${pStyle.ring}`}
                                    aria-hidden
                                  />

                                  {/* Card */}
                                  <div className={`rounded-lg border bg-white shadow-sm hover:shadow transition ${overdue ? 'border-red-300' : 'border-gray-200'}`}>
                                    <div className="p-3 md:p-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          {/* Title + chips */}
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold text-gray-900">{t.title}</h4>
                                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold ${pStyle.chip}`}>
                                              <FiFlag size={10} /> {pStyle.label}
                                            </span>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                                              t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                              overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {t.status === 'COMPLETED' ? 'COMPLETED' : (overdue ? 'OVERDUE' : 'PENDING')}
                                            </span>
                                            {t.submittedLate && (
                                              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-300">
                                                SUBMITTED LATE
                                              </span>
                                            )}
                                            {t.sharedCompletion && (
                                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 border border-purple-300" title="Group-shared: completing this cascades to all faculty in the group">
                                                <FiUsers size={10} /> Group-shared
                                              </span>
                                            )}
                                            {t.groupTaskId && !t.sharedCompletion && (
                                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-300" title="Bulk copy: each faculty has an independent copy of this task">
                                                <FiUsers size={10} /> Bulk copy
                                              </span>
                                            )}
                                          </div>

                                          {t.description && (
                                            <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-wrap">{t.description}</p>
                                          )}

                                          {/* Meta row */}
                                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                                            <span className="inline-flex items-center gap-1">
                                              <FiClock size={11} /> Assigned {fmtDate(t.createdAt)}
                                            </span>
                                            {t.deadline && (
                                              <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-700 font-semibold' : ''}`}>
                                                <FiCalendar size={11} /> Due {fmtDateShort(t.deadline)} {fmtTime(t.deadline)}
                                              </span>
                                            )}
                                            {t.completedAt && (
                                              <span className="inline-flex items-center gap-1 text-green-700">
                                                <FiCheck size={11} /> Completed {fmtDate(t.completedAt)}
                                              </span>
                                            )}
                                          </div>

                                          {/* Submission document */}
                                          {t.documentUrl && (
                                            <a
                                              href={t.documentUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm text-blue-700 font-medium border border-blue-200"
                                            >
                                              <FiFileText size={13} />
                                              <span className="max-w-[18rem] truncate">{t.documentName || 'Submission'}</span>
                                              <FiDownload size={12} />
                                            </a>
                                          )}
                                        </div>

                                        {/* Right column: actions */}
                                        <div className="flex flex-col gap-1 items-end shrink-0">
                                          {t.status === 'PENDING' ? (
                                            <button
                                              onClick={() => handleMarkDone(t.id)}
                                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-green-50 hover:bg-green-100 text-green-700"
                                              title="Mark as done (admin override)"
                                            >
                                              <FiCheck /> Done
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
                                            onClick={() => openEdit(t)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-700"
                                          >
                                            <FiEdit2 /> Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteTask(t.id)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-red-50 hover:bg-red-100 text-red-700"
                                          >
                                            <FiTrash2 /> Delete
                                          </button>
                                        </div>
                                      </div>

                                      {/* Admin remark — inline editor */}
                                      <div className="mt-3 pt-3 border-t border-gray-100">
                                        {!isRemarkOpen ? (
                                          currentRemark ? (
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 flex items-start gap-2">
                                              <FiMessageSquare className="text-indigo-700 mt-0.5 shrink-0" size={14} />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-indigo-900 mb-0.5">Admin remark</p>
                                                <p className="text-sm text-indigo-900 whitespace-pre-wrap">{currentRemark}</p>
                                                {t.Remarker && (
                                                  <p className="text-[11px] text-indigo-700 mt-1">
                                                    by {t.Remarker.firstName} {t.Remarker.lastName || ''} · {fmtDate(t.remarkedAt)}
                                                  </p>
                                                )}
                                              </div>
                                              <button
                                                onClick={() => setRemarkDraft((p) => ({ ...p, [t.id]: currentRemark }))}
                                                className="text-xs text-indigo-700 hover:underline shrink-0"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => setRemarkDraft((p) => ({ ...p, [t.id]: '' }))}
                                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                                            >
                                              <FiMessageSquare size={12} /> Add remark
                                            </button>
                                          )
                                        ) : (
                                          <div>
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Admin remark</label>
                                            <textarea
                                              value={draftValue}
                                              onChange={(e) => setRemarkDraft((p) => ({ ...p, [t.id]: e.target.value }))}
                                              rows={3}
                                              maxLength={5000}
                                              placeholder="Feedback for the faculty on this submission…"
                                              className="w-full px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <div className="flex items-center gap-2 mt-2">
                                              <button
                                                onClick={() => handleSaveRemark(t.id)}
                                                disabled={savingRemarkId === t.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                                              >
                                                {savingRemarkId === t.id ? <FiLoader className="animate-spin" /> : <FiSave />} Save
                                              </button>
                                              <button
                                                onClick={() => setRemarkDraft((p) => { const n = { ...p }; delete n[t.id]; return n; })}
                                                className="px-3 py-1 text-xs font-semibold rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                              >
                                                Cancel
                                              </button>
                                              {currentRemark && (
                                                <button
                                                  onClick={() => { setRemarkDraft((p) => ({ ...p, [t.id]: '' })); }}
                                                  className="text-xs text-red-700 hover:underline ml-auto"
                                                  title="Clear the remark (saves an empty string to remove it)"
                                                >
                                                  Clear text
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      ))}
                    </div>
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
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = form.priority === p;
                    const st = PRIORITY_STYLE[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded border-2 transition ${active ? st.pickerActive : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
                      >
                        <FiFlag size={11} /> {st.label}
                      </button>
                    );
                  })}
                </div>
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

      {/* Edit-task modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  maxLength={250}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = editForm.priority === p;
                    const st = PRIORITY_STYLE[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, priority: p }))}
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded border-2 transition ${active ? st.pickerActive : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
                      >
                        <FiFlag size={11} /> {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description (optional)</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Deadline (optional)</label>
                <input
                  type="datetime-local"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.title.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk-assign modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-indigo-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><FiZap /> Bulk Assign Task</h3>
              <button onClick={() => setShowBulk(false)} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Mode */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">Assignment mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkForm((p) => ({ ...p, mode: 'INDIVIDUAL' }))}
                    className={`p-3 text-left rounded-lg border-2 transition ${bulkForm.mode === 'INDIVIDUAL' ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-300 hover:border-gray-400'}`}
                  >
                    <p className="font-bold text-sm text-gray-900">📋 Individual copies</p>
                    <p className="text-xs text-gray-600 mt-1">Each faculty gets their own independent task. They each complete it separately.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkForm((p) => ({ ...p, mode: 'SHARED' }))}
                    className={`p-3 text-left rounded-lg border-2 transition ${bulkForm.mode === 'SHARED' ? 'bg-purple-50 border-purple-600' : 'bg-white border-gray-300 hover:border-gray-400'}`}
                  >
                    <p className="font-bold text-sm text-gray-900">👥 Shared (group) task</p>
                    <p className="text-xs text-gray-600 mt-1">One task visible to all. When anyone completes it, it&apos;s done for everyone.</p>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  value={bulkForm.title}
                  onChange={(e) => setBulkForm((p) => ({ ...p, title: e.target.value }))}
                  maxLength={250}
                  placeholder="e.g. Submit monthly placement update"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = bulkForm.priority === p;
                    const st = PRIORITY_STYLE[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBulkForm((prev) => ({ ...prev, priority: p }))}
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded border-2 transition ${active ? st.pickerActive : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
                      >
                        <FiFlag size={11} /> {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Deadline (optional)</label>
                  <input
                    type="datetime-local"
                    value={bulkForm.deadline}
                    onChange={(e) => setBulkForm((p) => ({ ...p, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full">
                    <p className="text-[10px] uppercase font-bold text-gray-500">Will assign to</p>
                    <p className="text-lg font-bold text-gray-900">{resolvedAssigneeCount} faculty</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description (optional)</label>
                <textarea
                  value={bulkForm.description}
                  onChange={(e) => setBulkForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Groups */}
              {groups.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                    Pick groups ({bulkForm.groupIds.size} selected)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
                    {groups.map((g) => {
                      const checked = bulkForm.groupIds.has(g.id);
                      return (
                        <label key={g.id} className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition ${checked ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-gray-300 hover:border-gray-400'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setBulkForm((p) => {
                              const next = new Set(p.groupIds);
                              if (checked) next.delete(g.id); else next.add(g.id);
                              return { ...p, groupIds: next };
                            })}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                            <p className="text-[11px] text-gray-600">{g.Members.length} member{g.Members.length === 1 ? '' : 's'}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Individual faculty pick */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase">
                    Pick faculty ({bulkForm.assigneeIds.size} selected)
                  </label>
                  <input
                    type="text"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    placeholder="Search faculty…"
                    className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500"
                  />
                </div>
                <div className="border-2 border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {bulkVisibleFaculty.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 italic">No faculty match.</p>
                  ) : (
                    bulkVisibleFaculty.map((f) => {
                      const checked = bulkForm.assigneeIds.has(f.user.id);
                      return (
                        <label key={f.user.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setBulkForm((p) => {
                              const next = new Set(p.assigneeIds);
                              if (checked) next.delete(f.user.id); else next.add(f.user.id);
                              return { ...p, assigneeIds: next };
                            })}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{f.user.firstName} {f.user.lastName || ''}</p>
                            <p className="text-xs text-gray-600 truncate">{f.user.email} · {f.user.approvedRole}{f.user.department ? ` · ${f.user.department}` : ''}</p>
                          </div>
                          {f.accuracy != null && (
                            <span className={`text-[11px] font-bold shrink-0 ${f.accuracy >= 80 ? 'text-green-600' : f.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {f.accuracy}%
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setShowBulk(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={handleBulkCreate}
                disabled={bulkCreating || !bulkForm.title.trim() || resolvedAssigneeCount === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded font-semibold flex items-center gap-2"
              >
                <FiZap /> {bulkCreating ? 'Creating…' : `Assign to ${resolvedAssigneeCount} faculty`}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
