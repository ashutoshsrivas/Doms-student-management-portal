'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiAward, FiUser, FiCalendar } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type GradeRow = {
  id: string;
  title: string;
  sessionName: string;
  grade: string;
  remark: string;
  gradedByName: string;
  gradedAt: string | null;
};

const label = (g: string) => (g === 'AB' ? 'AB (absent)' : g);
const chipClass = (g: string) => ({
  'O': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'A+': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'A': 'bg-green-50 text-green-700 border-green-200',
  'B+': 'bg-blue-50 text-blue-700 border-blue-200',
  'B': 'bg-sky-50 text-sky-700 border-sky-200',
  'C': 'bg-amber-50 text-amber-700 border-amber-200',
  'P': 'bg-orange-50 text-orange-700 border-orange-200',
  'F': 'bg-red-50 text-red-700 border-red-200',
  'AB': 'bg-gray-50 text-gray-600 border-gray-200',
}[g] || 'bg-gray-50 text-gray-600 border-gray-200');

const fmt = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

function Content() {
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [averageLetter, setAverageLetter] = useState<string | null>(null);
  const [countedForAverage, setCountedForAverage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/grades/me');
        setGrades(res.data.grades || []);
        setAverage(res.data.average);
        setAverageLetter(res.data.averageLetter);
        setCountedForAverage(res.data.countedForAverage || 0);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load your grades');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
        <p className="mt-1 text-sm text-gray-500">Every topic you have been graded on, and who graded it.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="py-4 text-center text-sm text-gray-500">Loading…</div>
        ) : averageLetter ? (
          <div className="flex items-center gap-4">
            <span className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl font-bold ${chipClass(averageLetter)}`}>
              {averageLetter}
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Average grade</div>
              <div className="text-lg font-bold text-gray-900">{averageLetter} <span className="text-sm font-medium text-gray-500">({average} / 10)</span></div>
              <div className="text-xs text-gray-500">
                From {countedForAverage} grade{countedForAverage === 1 ? '' : 's'}
                {grades.length > countedForAverage && <> · {grades.length - countedForAverage} marked AB (not counted)</>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">You have not been graded yet.</p>
        )}
      </div>

      {!loading && grades.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <FiAward className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-900">Topics</span>
            <span className="ml-auto text-xs text-gray-500">{grades.length}</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {grades.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold ${chipClass(g.grade)}`}>
                  {g.grade === 'AB' ? '—' : g.grade}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{g.title}</div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1"><FiUser className="h-3 w-3" /> {g.gradedByName || '—'}</span>
                    <span className="inline-flex items-center gap-1"><FiCalendar className="h-3 w-3" /> {fmt(g.gradedAt)}</span>
                    {g.sessionName && <span>{g.sessionName}</span>}
                  </div>
                  {g.remark && <p className="mt-0.5 text-xs text-gray-600">{g.remark}</p>}
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${chipClass(g.grade)}`}>{label(g.grade)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function StudentGradesPage() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
