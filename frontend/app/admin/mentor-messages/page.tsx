'use client';

// Supervisor view — browse every mentor <-> mentee conversation. Any
// authenticated supervisor (ADMIN / HOD / COORDINATOR / PLACEMENT_COORDINATOR)
// can read + reply on any thread via the shared modal.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMessageCircle, FiSearch, FiUser, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import MentorFeedbackModal from '@/app/components/MentorFeedbackModal';

interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  approvedRole?: string | null;
  department?: string | null;
}

interface ThreadRow {
  mentor: Person;
  student: Person;
  messageCount: number;
  lastMessage: {
    body: string;
    createdAt: string;
    fromMentor: boolean;
    fromStudent: boolean;
  };
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', HOD: 'HOD', FACULTY: 'Faculty',
  CHAIR_HEAD: 'Chair Head', COORDINATOR: 'Coordinator',
  PLACEMENT_COORDINATOR: 'Placement Coord.',
  TRAINER: 'Trainer', MENTOR: 'Mentor',
};

const SUPERVISOR_ROLES = ['ADMIN', 'HOD', 'COORDINATOR', 'PLACEMENT_COORDINATOR'];

const fullName = (p: Person) =>
  `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email;

const shortTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    year: sameYear ? undefined : 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function MentorMessagesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<ThreadRow | null>(null);

  const isSupervisor = user && SUPERVISOR_ROLES.includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (!isSupervisor) {
      router.push('/dashboard');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSupervisor]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/mentor-feedback/all');
      setRows(data.threads || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        fullName(r.mentor), r.mentor.email,
        fullName(r.student), r.student.email,
        r.lastMessage?.body || '',
        ROLE_LABEL[r.mentor.approvedRole || ''] || '',
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  if (!user || !isSupervisor) {
    return (
      <DashboardLayout>
        <div className="p-6 text-gray-500">Loading…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <FiMessageCircle className="w-6 h-6 text-blue-600" />
              Mentor Messages
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Every mentor–mentee conversation in the system. Click any row to open, read, or reply.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <FiRefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mentor, mentee, email or message text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading conversations…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              {rows.length === 0 ? 'No mentor conversations yet.' : 'No matches.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const key = `${r.mentor.id}::${r.student.id}`;
                const author = r.lastMessage.fromMentor
                  ? `Mentor (${fullName(r.mentor)})`
                  : r.lastMessage.fromStudent
                    ? `Student (${fullName(r.student)})`
                    : 'Supervisor';
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setActive(r)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <FiUser className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {fullName(r.mentor)}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {ROLE_LABEL[r.mentor.approvedRole || ''] || r.mentor.approvedRole || ''}
                          </span>
                          <span className="text-gray-400 text-xs">→</span>
                          <span className="text-sm font-medium text-gray-900">
                            {fullName(r.student)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5 truncate">
                          <span className="font-medium">{author}:</span>{' '}
                          {r.lastMessage.body}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-gray-500">
                          {shortTime(r.lastMessage.createdAt)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {r.messageCount} msg{r.messageCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {rows.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Showing {filtered.length} of {rows.length} conversations.
          </p>
        )}
      </div>

      {active && (
        <MentorFeedbackModal
          open={!!active}
          onClose={() => setActive(null)}
          mentorUserId={active.mentor.id}
          studentUserId={active.student.id}
          headerTitle={`${fullName(active.mentor)} ↔ ${fullName(active.student)}`}
          headerSubtitle={`${ROLE_LABEL[active.mentor.approvedRole || ''] || active.mentor.approvedRole || 'Mentor'} · ${active.student.email}`}
          profileHref={null}
        />
      )}
    </DashboardLayout>
  );
}
