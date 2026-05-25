'use client';

// Faculty (and any non-student non-admin assignee) view of tasks assigned
// to them. Two tabs — Pending and Completed. Mark-done supports an
// optional supporting document upload.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiCheck, FiClock, FiCalendar, FiPaperclip, FiAlertCircle,
  FiFileText, FiDownload, FiUpload, FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

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
  Assigner?: { id: string; firstName: string; lastName: string | null; email: string };
}

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : '—');
const fmtDateShort = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : '—');

export default function MyTasksPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');

  // Mark-done modal state
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only people who can be assignees should reach this page
  useEffect(() => {
    if (!user) return;
    const ok = ['HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR', 'ADMIN'].includes(user.role);
    if (!ok) router.push('/dashboard');
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/faculty-tasks');
      setTasks(res.data.tasks || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = tasks.filter((t) => t.status === 'PENDING');
  const completed = tasks.filter((t) => t.status === 'COMPLETED');
  const visible = tab === 'pending' ? pending : completed;

  const onOpenAction = (t: Task) => {
    setActionTask(t);
    setFileToUpload(null);
  };
  const onCloseAction = () => {
    setActionTask(null);
    setFileToUpload(null);
  };

  const submitComplete = async () => {
    if (!actionTask) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (fileToUpload) fd.append('document', fileToUpload);
      await apiClient.patch(`/faculty-tasks/${actionTask.id}/complete`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Task marked done');
      onCloseAction();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to mark done');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="My Tasks">
      <div className="py-6 px-2 md:px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-1 text-sm">Tasks assigned to you by the admin.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
          >
            <FiArrowLeft /> Back
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4 flex">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 ${
              tab === 'pending'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiClock /> Pending
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full px-2 py-0.5">{pending.length}</span>
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 ${
              tab === 'completed'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiCheck /> Completed
            <span className="bg-green-100 text-green-800 text-xs font-bold rounded-full px-2 py-0.5">{completed.length}</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
            {tab === 'pending' ? 'No pending tasks 🎉' : 'No completed tasks yet.'}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((t) => {
              const overdue = t.status === 'PENDING' && t.deadline && new Date(t.deadline).getTime() < Date.now();
              return (
                <li key={t.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{t.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t.status === 'COMPLETED' ? 'COMPLETED' : overdue ? 'OVERDUE' : 'PENDING'}
                        </span>
                      </div>
                      {t.description && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{t.description}</p>}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-gray-600">
                        {t.deadline && <span className="inline-flex items-center gap-1"><FiCalendar /> Deadline: {fmtDateShort(t.deadline)}</span>}
                        <span>Assigned by: {t.Assigner ? `${t.Assigner.firstName} ${t.Assigner.lastName || ''}` : '—'}</span>
                        <span>Created: {fmtDate(t.createdAt)}</span>
                        {t.completedAt && <span>Completed: {fmtDate(t.completedAt)}</span>}
                      </div>
                      {t.documentUrl && (
                        <a
                          href={t.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-700 hover:underline font-semibold"
                        >
                          <FiFileText /> {t.documentName || 'Supporting document'} <FiDownload size={12} />
                        </a>
                      )}
                    </div>
                    {t.status === 'PENDING' && (
                      <button
                        onClick={() => onOpenAction(t)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
                      >
                        <FiCheck /> Mark Done
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Mark-done modal */}
      {actionTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-green-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold">Mark task as done</h3>
              <button onClick={onCloseAction} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Task</p>
                <p className="font-bold text-gray-900">{actionTask.title}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Supporting document (optional)
                </label>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-green-600 hover:bg-green-50 transition">
                  <input
                    type="file"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {fileToUpload ? (
                    <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                      <FiPaperclip /> {fileToUpload.name}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setFileToUpload(null); }}
                        className="text-red-600 ml-2"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-600 text-sm">
                      <FiUpload size={20} className="mb-1" />
                      Click to choose a file (PDF, image, doc)
                    </div>
                  )}
                </label>
                <p className="text-xs text-gray-500 mt-1">Max 100 MB. Any file type accepted.</p>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={onCloseAction} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={submitComplete}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-semibold flex items-center gap-2"
              >
                <FiCheck /> {submitting ? 'Submitting…' : 'Mark as done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
