'use client';

// Student-side widget: lists the student's active mentors with the last
// message snippet. Clicking a mentor opens the shared feedback modal so
// the student can read/reply to that mentor's thread.

import { useEffect, useState } from 'react';
import { FiMessageCircle, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import apiClient from '@/app/lib/apiClient';
import useAuthStore from '@/app/store/authStore';
import MentorFeedbackModal from './MentorFeedbackModal';

interface Mentor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  approvedRole?: string | null;
  department?: string | null;
}

interface MentorRow {
  mentor: Mentor;
  lastMessage: { body: string; createdAt: string; fromMentor: boolean } | null;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', HOD: 'HOD', FACULTY: 'Faculty',
  CHAIR_HEAD: 'Chair Head', COORDINATOR: 'Coordinator',
  PLACEMENT_COORDINATOR: 'Placement Coord.',
  TRAINER: 'Trainer', MENTOR: 'Mentor',
};

const mentorName = (m: Mentor) =>
  `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;

const shortTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function StudentMentorFeedback() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<MentorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Mentor | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/mentor-feedback/my-mentors');
        setRows(data.mentors || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load mentors');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-500">
        Loading mentor conversations…
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <FiMessageCircle className="w-5 h-5 text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900">Mentor Conversations</h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.map((r) => {
          const m = r.mentor;
          const last = r.lastMessage;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActive(m)}
                className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center gap-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FiUser className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-gray-900">{mentorName(m)}</span>
                    <span className="text-[11px] text-gray-500">
                      {ROLE_LABEL[m.approvedRole || ''] || m.approvedRole || ''}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 truncate mt-0.5">
                    {last ? (
                      <>
                        <span className="font-medium">
                          {last.fromMentor ? 'Mentor:' : 'You:'}
                        </span>{' '}
                        {last.body}
                      </>
                    ) : (
                      <span className="italic text-gray-400">No messages yet — say hello</span>
                    )}
                  </div>
                </div>
                {last && (
                  <span className="text-[11px] text-gray-500 shrink-0">
                    {shortTime(last.createdAt)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {active && user?.id && (
        <MentorFeedbackModal
          open={!!active}
          onClose={() => setActive(null)}
          mentorUserId={active.id}
          studentUserId={user.id}
          headerTitle={mentorName(active)}
          headerSubtitle={active.email}
          profileHref={null}
        />
      )}
    </div>
  );
}
