'use client';

import { Fragment, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiCalendar, FiUsers, FiCheckCircle, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Session = { id: string; name: string };
type Coordinator = { id: string; firstName: string | null; lastName: string | null; email: string; approvedRole?: string };
type ClassRow = {
  id: string;
  name: string;
  Session: Session | null;
  Coordinator: Coordinator | null;
};
type AttendanceRow = {
  id: string;
  date: string;
  classTiming?: string;
  additionalInfo?: string;
  presentCount: number;
  bunkedCount: number;
  leaveCount: number;
  submittedAt: string;
  submitter: { id: string; name: string } | null;
  hasATR: boolean;
};

const nameOf = (u: Coordinator | null) =>
  u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : '—';

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function Content() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/classes');
        setClasses(res.data.classes || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          As a Class Representative, punch present / skipped / leave counts for your class — per class timing.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          You are not assigned as a Class Representative on any class yet. Ask your class coordinator to add you.
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => <ClassCard key={c.id} cls={c} />)}
        </div>
      )}
    </div>
  );
}

function ClassCard({ cls }: { cls: ClassRow }) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayISO());
  const [timing, setTiming] = useState('');
  const [present, setPresent] = useState('');
  const [bunked, setBunked] = useState('');
  const [leave, setLeave] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/classes/${cls.id}/attendance`);
      setRows(res.data.attendance || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cls.id]);

  // Pre-fill from any existing record for the chosen date + timing so editing
  // an entry doesn't clobber a previous one accidentally.
  useEffect(() => {
    const existing = rows.find((r) => r.date === date && (r.classTiming || '') === timing.trim());
    if (existing) {
      setPresent(String(existing.presentCount));
      setBunked(String(existing.bunkedCount));
      setLeave(String(existing.leaveCount));
      setInfo(existing.additionalInfo || '');
    } else {
      setPresent('');
      setBunked('');
      setLeave('');
      setInfo('');
    }
  }, [rows, date, timing]);

  const punch = async () => {
    if (!date) { toast.error('Pick a date'); return; }
    const p = parseInt(present, 10) || 0;
    const b = parseInt(bunked, 10) || 0;
    const l = parseInt(leave, 10) || 0;
    if (p + b + l === 0) { toast.error('Enter at least one count'); return; }
    try {
      setSaving(true);
      await apiClient.post(`/classes/${cls.id}/attendance`, {
        date, classTiming: timing.trim(), presentCount: p, bunkedCount: b, leaveCount: l,
        additionalInfo: info.trim(),
      });
      toast.success('Attendance submitted');
      setTiming('');
      setInfo('');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  // Group history by date, newest date first, then by class timing within a date.
  const grouped = (() => {
    const map = new Map<string, AttendanceRow[]>();
    for (const r of rows) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([d, list]) => [d, [...list].sort((x, y) => (x.classTiming || '').localeCompare(y.classTiming || ''))] as const);
  })();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">{cls.name}</h2>
        <div className="mt-0.5 text-xs text-gray-600">
          {cls.Session?.name || '—'} · Coordinator: {nameOf(cls.Coordinator)}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Class Timing</label>
            <input type="text" value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="e.g. 10–11 AM" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 mb-1">Present</label>
            <input type="number" min={0} value={present} onChange={(e) => setPresent(e.target.value)} placeholder="0" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-red-700 mb-1">Skipped</label>
            <input type="number" min={0} value={bunked} onChange={(e) => setBunked(e.target.value)} placeholder="0" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1">Leave</label>
            <input type="number" min={0} value={leave} onChange={(e) => setLeave(e.target.value)} placeholder="0" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={punch} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <FiCheckCircle className="h-4 w-4" /> {saving ? 'Saving…' : 'Punch'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Additional info <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={2} placeholder="Anything worth noting — e.g. reason for skips, guest lecture, exam…" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        </div>

        <button type="button" onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900">
          {showHistory ? <FiChevronUp className="h-3.5 w-3.5" /> : <FiChevronDown className="h-3.5 w-3.5" />}
          History ({rows.length})
        </button>

        {showHistory && (
          loading ? (
            <div className="py-4 text-center text-sm text-gray-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500 italic">No entries yet.</div>
          ) : (
            <div className="space-y-3">
              {grouped.map(([d, list]) => (
                <div key={d} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b border-gray-100">
                    <FiCalendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{fmt(d)}</span>
                    <span className="text-[11px] text-gray-500">· {list.length} {list.length === 1 ? 'entry' : 'entries'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full text-sm">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Class Timing</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Present</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Skipped</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Leave</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Info</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {list.map((r) => (
                          <tr key={r.id}>
                            <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{r.classTiming?.trim() ? r.classTiming : <span className="text-gray-400 italic">—</span>}</td>
                            <td className="px-3 py-2 text-emerald-700 font-semibold">{r.presentCount}</td>
                            <td className="px-3 py-2 text-red-700 font-semibold">{r.bunkedCount}</td>
                            <td className="px-3 py-2 text-amber-700 font-semibold">{r.leaveCount}</td>
                            <td className="px-3 py-2 text-xs text-gray-600 max-w-[220px] whitespace-pre-wrap break-words">{r.additionalInfo?.trim() ? r.additionalInfo : <span className="text-gray-400 italic">—</span>}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{r.submitter?.name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function StudentClassAttendancePage() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
