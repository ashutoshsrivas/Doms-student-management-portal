'use client';

import { useEffect } from 'react';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';
import useSessionStore from '@/app/store/sessionStore';

// Compact topbar dropdown that lets staff pick which academic session to
// scope their dashboards to. Hidden for STUDENT (they only have their own
// enrolment). Selection is persisted in localStorage and read by list
// pages as their initial session filter.
export default function SessionSelector() {
  const { user } = useAuthStore();
  const { sessions, activeSessionId, loaded, loading, loadSessions, setActiveSessionId } = useSessionStore();

  useEffect(() => {
    if (!user) return;
    if (user.role === 'STUDENT') return;
    if (!loaded && !loading) loadSessions();
  }, [user, loaded, loading, loadSessions]);

  if (!user || user.role === 'STUDENT') return null;
  if (!loaded) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-full bg-gray-100 text-xs text-gray-500">
        <FiCalendar className="w-3.5 h-3.5" />
        <span>Loading sessions...</span>
      </div>
    );
  }
  if (sessions.length === 0) return null;

  return (
    <div className="relative flex items-center">
      <FiCalendar className="absolute left-2.5 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
      <select
        value={activeSessionId || ''}
        onChange={(e) => setActiveSessionId(e.target.value || null)}
        className="appearance-none pl-7 pr-7 py-1 text-xs font-medium bg-white border border-gray-300 rounded-full text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer max-w-[180px] truncate"
        title="Scope this browser to a single academic session"
      >
        <option value="">All sessions</option>
        {sessions.map((s: { id: string; name: string; isActive?: boolean }) => (
          <option key={s.id} value={s.id}>
            {s.name}{s.isActive ? ' • active' : ''}
          </option>
        ))}
      </select>
      <FiChevronDown className="absolute right-2 w-3 h-3 text-gray-500 pointer-events-none" />
    </div>
  );
}
