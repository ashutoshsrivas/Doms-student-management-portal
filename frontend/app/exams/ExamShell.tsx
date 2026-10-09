'use client';

import { ReactNode, createContext, useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiFileText, FiLogOut, FiUser } from 'react-icons/fi';
import useExamsUser from './lib/useExamsUser';
import { ExamsUser } from './lib/session';

// The exams portal is a standalone application: its own session, its own
// frame, its own login. It shares nothing with the DOMS portal except the
// credentials people sign in with.
const STAFF_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];

const ExamsUserContext = createContext<ExamsUser | null>(null);
export const useExamsViewer = () => useContext(ExamsUserContext);

export default function ExamShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, signOut } = useExamsUser();

  useEffect(() => {
    if (status === 'anonymous') {
      const next = pathname && pathname.startsWith('/exams') ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/exams/login${next}`);
    }
  }, [status, pathname, router]);

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-800/60 p-6 text-center">
          <h1 className="text-lg font-bold text-white">No access</h1>
          <p className="mt-2 text-sm text-slate-400">The exams portal is for faculty and staff only.</p>
          <button
            type="button"
            onClick={() => { signOut(); router.replace('/exams/login'); }}
            className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <ExamsUserContext.Provider value={user}>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 text-white">
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
                {user.name || user.email}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{user.approvedRole}</span>
              </span>
              <button
                type="button"
                onClick={() => { signOut(); router.replace('/exams/login'); }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-200 hover:bg-white/10"
              >
                <FiLogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </ExamsUserContext.Provider>
  );
}
