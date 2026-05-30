'use client';

// Admin: a single sorted queue of every PENDING task across all faculty,
// bucketed Overdue / Today / Upcoming / No deadline, each sorted by
// priority desc then deadline asc. Designed as a focused triage view —
// the admin can see at a glance what's slipping and act on it.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiAlertCircle, FiClock, FiCalendar, FiFlag,
  FiUsers, FiUser, FiExternalLink, FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const PRIORITY_STYLE: Record<Priority, { chip: string; rank: number; label: string }> = {
  URGENT: { chip: 'bg-red-100 text-red-800 border-red-300', rank: 4, label: 'Urgent' },
  HIGH:   { chip: 'bg-orange-100 text-orange-800 border-orange-300', rank: 3, label: 'High' },
  MEDIUM: { chip: 'bg-blue-100 text-blue-800 border-blue-300', rank: 2, label: 'Medium' },
  LOW:    { chip: 'bg-gray-100 text-gray-700 border-gray-300', rank: 1, label: 'Low' },
};

interface Task {
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority: Priority;
  sharedCompletion?: boolean;
  groupTaskId?: string | null;
  extensionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  createdAt: string;
  Assignee?: { id: string; firstName: string; lastName: string | null; email: string; approvedRole: string; department?: string };
  Assigner?: { id: string; firstName: string; lastName: string | null; email: string };
}

interface QueueData {
  buckets: {
    overdue: Task[];
    today: Task[];
    upcoming: Task[];
    undated: Task[];
  };
  counts: { overdue: number; today: number; upcoming: number; undated: number; total: number };
}

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : '—');

export default function AdminPendingTasksPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');

  useEffect(() => {
    if (user && !['ADMIN', 'HOD'].includes(user.role)) router.push('/dashboard');
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/faculty-tasks/pending-queue');
      setData(res.data);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filterPriority = (rows: Task[]) =>
    priorityFilter === 'ALL' ? rows : rows.filter((t) => t.priority === priorityFilter);

  const renderTask = (t: Task) => {
    const overdue = t.deadline && new Date(t.deadline).getTime() < Date.now();
    const ps = PRIORITY_STYLE[t.priority];
    return (
      <li key={t.id} className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow transition ${overdue ? 'border-red-300' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900">{t.title}</h4>
              <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold ${ps.chip}`}>
                <FiFlag size={10} /> {ps.label}
              </span>
              {t.sharedCompletion && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                  <FiUsers size={10} /> Shared
                </span>
              )}
              {t.extensionStatus === 'PENDING' && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                  <FiClock size={10} /> Extension requested
                </span>
              )}
            </div>
            {t.description && <p className="text-sm text-gray-700 mt-1 line-clamp-2 whitespace-pre-wrap">{t.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <FiUser size={11} /> {t.Assignee ? `${t.Assignee.firstName} ${t.Assignee.lastName || ''}` : '—'}
                <span className="text-gray-400">·</span>
                <span className="font-semibold">{t.Assignee?.approvedRole}</span>
                {t.Assignee?.department && <span className="text-gray-400">·</span>}
                {t.Assignee?.department && <span>{t.Assignee.department}</span>}
              </span>
              {t.deadline && (
                <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-700 font-semibold' : ''}`}>
                  <FiCalendar size={11} /> Due {fmtDate(t.deadline)}
                </span>
              )}
            </div>
          </div>
          <a
            href={`/admin/faculty-tasks?facultyId=${t.Assignee?.id || ''}`}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 shrink-0"
            title="Open in Faculty Tasks"
          >
            <FiExternalLink /> Open
          </a>
        </div>
      </li>
    );
  };

  const renderBucket = (label: string, tone: string, tasks: Task[]) => {
    const filtered = filterPriority(tasks);
    return (
      <section className="mb-6 last:mb-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${tone}`}>
            {label}
            <span className="text-xs font-semibold bg-white border border-gray-300 rounded-full px-2 py-0.5 text-gray-700">
              {filtered.length}{filtered.length !== tasks.length && ` / ${tasks.length}`}
            </span>
          </h3>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 italic">— Nothing here.</p>
        ) : (
          <ul className="space-y-2">{filtered.map(renderTask)}</ul>
        )}
      </section>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Pending Queue">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pending Queue">
      <div className="py-6 px-2 md:px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Queue</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Every pending task across all faculty, bucketed by urgency. Within each bucket, items are sorted by priority then deadline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
              title="Refresh"
            >
              <FiRefreshCw /> Refresh
            </button>
            <button
              onClick={() => router.push('/admin/faculty-tasks')}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
            >
              <FiArrowLeft /> Faculty Tasks
            </button>
          </div>
        </div>

        {/* Counters */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
            <div className="bg-white border border-red-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{data.counts.overdue}</p>
              <p className="text-[11px] uppercase font-semibold text-gray-600">Overdue</p>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{data.counts.today}</p>
              <p className="text-[11px] uppercase font-semibold text-gray-600">Today</p>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{data.counts.upcoming}</p>
              <p className="text-[11px] uppercase font-semibold text-gray-600">Upcoming</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{data.counts.undated}</p>
              <p className="text-[11px] uppercase font-semibold text-gray-600">No deadline</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase text-gray-500">Priority:</span>
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

        {/* Buckets */}
        {!data || data.counts.total === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
            <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
            No pending tasks across the institution 🎉
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6">
            {renderBucket('Overdue', 'text-red-700', data.buckets.overdue)}
            {renderBucket('Today', 'text-blue-700', data.buckets.today)}
            {renderBucket('Upcoming', 'text-green-700', data.buckets.upcoming)}
            {renderBucket('No deadline', 'text-gray-700', data.buckets.undated)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
