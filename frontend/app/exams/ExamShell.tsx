'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiFileText, FiLogOut, FiExternalLink, FiUser } from 'react-icons/fi';
import useAuthStore from '@/app/store/authStore';

// The exams portal stands on its own — same login as DOMS, but its own
// frame rather than the main sidebar. Students never get in.
const STAFF_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];

export default function ExamShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !token) {
      router.push('/auth/login');
      return;
    }
    if (user?.role && !STAFF_ROLES.includes(user.role)) {
      router.push('/unauthorized');
      return;
    }
    setChecked(true);
  }, [isAuthenticated, token, user?.role, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/exams" className="flex items-center gap-2 font-bold tracking-tight">
            <FiFileText className="h-5 w-5 text-amber-400" />
            Exams Portal
          </Link>
          <nav className="ml-4 flex items-center gap-1 text-sm">
            <Link href="/exams" className="rounded-lg px-3 py-1.5 text-slate-200 hover:bg-white/10">Courses</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden items-center gap-1.5 text-slate-300 sm:flex">
              <FiUser className="h-4 w-4" />
              {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{user?.role}</span>
            </span>
            <Link href="/profile" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-200 hover:bg-white/10" title="Back to the DOMS portal">
              <FiExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">DOMS</span>
            </Link>
            <button
              type="button"
              onClick={() => { logout(); router.push('/auth/login'); }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-200 hover:bg-white/10"
            >
              <FiLogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
