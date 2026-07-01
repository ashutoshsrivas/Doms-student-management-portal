'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Student = { id: string; firstName: string | null; lastName: string | null; email: string };
type Session = { id: string; name: string; sipEnabled?: boolean };

type Row = {
  sipId: string;
  studentSessionId: string | null;
  student: Student | null;
  session: Session | null;
  enrollmentNo: string | null;
  specialization: string | null;
  companyName: string | null;
  jobRole: string | null;
  sipLocation: string | null;
  stipend: number | string | null;
  joinDate: string | null;
  completionDate: string | null;
  durationWeeks: number | string | null;
  status: 'PENDING' | 'COMPLETED' | string;
  weeksElapsed: number;
  expectedUpdates: number;
  updatesSubmitted: number;
  behindBy: number;
  currentWeekSubmitted: boolean;
  lastUpdateAt: string | null;
  ppOffered: boolean | null;
  certificateIssued: string | null;
};

type Stats = {
  totalSIPs: number;
  inProgress: number;
  completed: number;
  noUpdatesYet: number;
  currentWeekSubmissions: number;
  currentWeekMissing: number;
  behindCount: number;
  totalWeeklyUpdates: number;
  ppoCount: number;
};

type ChairHead = { id: string; firstName: string | null; lastName: string | null; email: string };

type MonitorResponse = {
  sessions: Session[];
  chairHeads: ChairHead[];
  selectedSessionId: string | null;
  selectedChairHeadId: string | null;
  stats: Stats;
  currentWeek: { weekStartDate: string; weekEndDate: string };
  rows: Row[];
};

const chairLabel = (c: ChairHead) =>
  `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email;

type WeeklyUpdate = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  statusText: string;
  submitted: boolean;
  submittedAt: string | null;
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

const studentLabel = (s: Student | null) =>
  s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email : 'Unknown';

function ComplianceBadge({ row }: { row: Row }) {
  if (row.status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <FiCheckCircle className="h-3 w-3" /> Completed
      </span>
    );
  }
  if (row.updatesSubmitted === 0 && row.weeksElapsed > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <FiAlertTriangle className="h-3 w-3" /> No updates yet
      </span>
    );
  }
  if (row.behindBy > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <FiAlertTriangle className="h-3 w-3" /> Behind by {row.behindBy} {row.behindBy === 1 ? 'wk' : 'wks'}
      </span>
    );
  }
  if (!row.joinDate) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        <FiClock className="h-3 w-3" /> Not started
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      <FiCheckCircle className="h-3 w-3" /> Up to date
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'gray',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: 'gray' | 'blue' | 'green' | 'amber' | 'red';
}) {
  const toneClasses: Record<string, string> = {
    gray: 'bg-white border-gray-200 text-gray-900',
    blue: 'bg-blue-50/40 border-blue-200 text-blue-900',
    green: 'bg-emerald-50/40 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50/40 border-amber-200 text-amber-900',
    red: 'bg-red-50/40 border-red-200 text-red-900',
  };
  return (
    <div className={`rounded-xl border ${toneClasses[tone]} px-4 py-3`}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-current/80">
        <span className="text-current/60">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-current">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 break-words">{value || '—'}</div>
    </div>
  );
}

function FileLink({ url, label }: { url?: string | null; label: string }) {
  if (!url) return <Field label={label} value={<span className="text-gray-400">Not uploaded</span>} />;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        View file <FiExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function DrillDown({ sipId }: { sipId: string }) {
  const [sip, setSip] = useState<any>(null);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [tab, setTab] = useState<'form' | 'updates'>('form');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [sipResp, upResp] = await Promise.all([
          apiClient.get(`/sip/${sipId}`),
          apiClient.get(`/sip/${sipId}/weekly-updates`),
        ]);
        if (cancelled) return;
        setSip(sipResp.data);
        setUpdates(Array.isArray(upResp.data) ? upResp.data : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sipId]);

  if (loading) return <div className="px-4 py-6 text-center text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!sip) return null;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setTab('form')}
          className={`rounded-md px-3 py-1 font-medium transition ${
            tab === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          SIP form
        </button>
        <button
          type="button"
          onClick={() => setTab('updates')}
          className={`rounded-md px-3 py-1 font-medium transition ${
            tab === 'updates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Weekly updates ({updates.length})
        </button>
      </div>

      {tab === 'form' ? (
        <div className="space-y-5">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Personal</h4>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Enrollment No." value={sip.enrollmentNo} />
              <Field label="Name on form" value={sip.studentName} />
              <Field label="Specialisation" value={sip.specialization} />
              <Field label="Email" value={sip.email} />
              <Field label="Phone" value={sip.phoneNo} />
              <Field label="Faculty mentor (declared)" value={sip.facultyMentorName} />
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Internship</h4>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company" value={sip.companyName} />
              <Field label="Job role" value={sip.jobRole} />
              <Field label="Location" value={sip.sipLocation} />
              <Field label="Stipend" value={sip.stipend ? `₹ ${sip.stipend}` : null} />
              <Field label="Duration (weeks)" value={sip.durationWeeks} />
              <Field label="Project title" value={sip.projectTitle} />
              <Field label="Join date" value={fmtDate(sip.joinDate)} />
              <Field label="NOC date" value={fmtDate(sip.nocDate)} />
              <Field label="Completion date" value={fmtDate(sip.completionDate)} />
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Company contacts</h4>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Supervisor" value={sip.supervisorName} />
              <Field label="Supervisor phone" value={sip.supervisorPhone} />
              <Field label="Supervisor email" value={sip.supervisorEmail} />
              <Field label="HR head" value={sip.hrHeadName} />
              <Field label="HR phone" value={sip.hrPhone} />
              <Field label="HR email" value={sip.hrEmail} />
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Outcome</h4>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Faculty grading" value={sip.facultyGrading} />
              <Field label="Supervisor grading" value={sip.supervisorGrading} />
              <Field label="PPO offered" value={sip.ppOffered ? 'Yes' : 'No'} />
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Documents</h4>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FileLink label="Certificate" url={sip.certificateIssued} />
              <FileLink label="Faculty feedback" url={sip.facultyFeedback} />
              <FileLink label="Supervisor feedback" url={sip.supervisorFeedback} />
            </div>
          </section>
        </div>
      ) : updates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No weekly updates submitted yet.
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-gray-200 pl-5">
          {updates.map((u) => (
            <li key={u.id} className="relative">
              <span className="absolute -left-[27px] mt-1 inline-block h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow" />
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-gray-900">
                    {fmtDate(u.weekStartDate)} → {fmtDate(u.weekEndDate)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Submitted {u.submittedAt ? fmtDate(u.submittedAt) : '—'}
                  </div>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700">{u.statusText}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

type ComplianceFilter = 'all' | 'behind' | 'no-updates' | 'up-to-date' | 'completed' | 'this-week';

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(rows: Row[], filename: string) {
  const header = [
    'Student',
    'Email',
    'Enrollment',
    'Session',
    'Specialisation',
    'Company',
    'Role',
    'Location',
    'Stipend',
    'Join date',
    'Duration (wks)',
    'Weeks elapsed',
    'Updates submitted',
    'Behind by',
    'Last update',
    'Current week submitted',
    'Status',
    'PPO offered',
  ];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    lines.push(
      [
        studentLabel(r.student),
        r.student?.email ?? '',
        r.enrollmentNo ?? '',
        r.session?.name ?? '',
        r.specialization ?? '',
        r.companyName ?? '',
        r.jobRole ?? '',
        r.sipLocation ?? '',
        r.stipend ?? '',
        r.joinDate ? new Date(r.joinDate).toISOString().slice(0, 10) : '',
        r.durationWeeks ?? '',
        r.weeksElapsed,
        r.updatesSubmitted,
        r.behindBy,
        r.lastUpdateAt ? new Date(r.lastUpdateAt).toISOString().slice(0, 10) : '',
        r.currentWeekSubmitted ? 'Yes' : 'No',
        r.status,
        r.ppOffered ? 'Yes' : 'No',
      ].map(escapeCsv).join(',')
    );
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Content() {
  const [data, setData] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [chairHeadId, setChairHeadId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ComplianceFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string> = {};
        if (sessionId) params.sessionId = sessionId;
        if (chairHeadId) params.chairHeadId = chairHeadId;
        const { data } = await apiClient.get('/sip/monitor', { params });
        if (!cancelled) setData(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load SIP monitor');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, chairHeadId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (filter === 'behind' && !(r.status !== 'COMPLETED' && r.behindBy > 0)) return false;
      if (filter === 'no-updates' && !(r.updatesSubmitted === 0 && r.weeksElapsed > 0)) return false;
      if (filter === 'up-to-date' && !(r.status !== 'COMPLETED' && r.behindBy === 0 && r.updatesSubmitted > 0)) return false;
      if (filter === 'completed' && r.status !== 'COMPLETED') return false;
      if (filter === 'this-week' && !r.currentWeekSubmitted) return false;
      if (!q) return true;
      const name = studentLabel(r.student).toLowerCase();
      const email = (r.student?.email || '').toLowerCase();
      const company = (r.companyName || '').toLowerCase();
      const enrol = (r.enrollmentNo || '').toLowerCase();
      return name.includes(q) || email.includes(q) || company.includes(q) || enrol.includes(q);
    });
  }, [data, query, filter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SIP Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Statistics and weekly-update compliance for every student on a Summer Internship Programme.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All SIP sessions</option>
            {(data?.sessions || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={chairHeadId}
            onChange={(e) => setChairHeadId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Chair Heads</option>
            {(data?.chairHeads || []).map((c) => (
              <option key={c.id} value={c.id}>
                {chairLabel(c)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!filtered.length}
            onClick={() => downloadCSV(filtered, `sip-monitor-${new Date().toISOString().slice(0, 10)}.csv`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Loading…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <StatCard label="Total SIPs" value={data.stats.totalSIPs} icon={<FiUsers className="h-4 w-4" />} />
            <StatCard label="In progress" value={data.stats.inProgress} icon={<FiBriefcase className="h-4 w-4" />} tone="blue" />
            <StatCard label="Completed" value={data.stats.completed} icon={<FiCheckCircle className="h-4 w-4" />} tone="green" />
            <StatCard label="Behind" value={data.stats.behindCount} icon={<FiAlertTriangle className="h-4 w-4" />} tone="amber" />
            <StatCard label="No updates yet" value={data.stats.noUpdatesYet} icon={<FiAlertTriangle className="h-4 w-4" />} tone="red" />
            <StatCard label="Weekly updates filed" value={data.stats.totalWeeklyUpdates} icon={<FiFileText className="h-4 w-4" />} />
            <StatCard
              label={`This week (${fmtDate(data.currentWeek.weekStartDate)})`}
              value={`${data.stats.currentWeekSubmissions} / ${data.stats.inProgress}`}
              icon={<FiTrendingUp className="h-4 w-4" />}
              tone="blue"
            />
            <StatCard label="Missing this week" value={data.stats.currentWeekMissing} icon={<FiClock className="h-4 w-4" />} tone="amber" />
            <StatCard label="PPO offered" value={data.stats.ppoCount} icon={<FiCheckCircle className="h-4 w-4" />} tone="green" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <div className="flex flex-wrap items-center gap-1">
              {([
                ['all', 'All', data.rows.length],
                ['behind', 'Behind', data.stats.behindCount],
                ['no-updates', 'No updates', data.stats.noUpdatesYet],
                ['this-week', 'Submitted this week', data.stats.currentWeekSubmissions],
                ['up-to-date', 'Up to date', Math.max(0, data.stats.inProgress - data.stats.behindCount - data.stats.noUpdatesYet)],
                ['completed', 'Completed', data.stats.completed],
              ] as [ComplianceFilter, string, number][]).map(([k, label, count]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filter === k
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label} <span className="opacity-70">({count})</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, company, enrolment…"
                className="w-72 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
              No students match the current filter.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5">Student</th>
                      <th className="px-3 py-2.5">Company</th>
                      <th className="px-3 py-2.5">Join</th>
                      <th className="px-3 py-2.5">Weeks</th>
                      <th className="px-3 py-2.5">Updates</th>
                      <th className="px-3 py-2.5">Last update</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((r) => {
                      const isOpen = expanded === r.sipId;
                      return (
                        <Fragment key={r.sipId}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-3 py-3 align-top">
                              <div className="font-medium text-gray-900">{studentLabel(r.student)}</div>
                              <div className="text-xs text-gray-500">{r.student?.email || '—'}</div>
                              {r.session?.name && (
                                <div className="mt-0.5 text-[11px] text-gray-400">{r.session.name}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="text-gray-900">{r.companyName || <span className="text-gray-400">—</span>}</div>
                              <div className="text-xs text-gray-500">{r.jobRole || ''}</div>
                            </td>
                            <td className="px-3 py-3 align-top text-gray-700">{fmtDate(r.joinDate)}</td>
                            <td className="px-3 py-3 align-top text-gray-700">
                              {r.weeksElapsed}
                              {r.durationWeeks ? <span className="text-gray-400"> / {r.durationWeeks}</span> : null}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="text-gray-900">{r.updatesSubmitted}</div>
                              {r.expectedUpdates > 0 && (
                                <div className="text-[11px] text-gray-500">expected {r.expectedUpdates}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top text-gray-700">{fmtDate(r.lastUpdateAt)}</td>
                            <td className="px-3 py-3 align-top">
                              <ComplianceBadge row={r} />
                              {r.currentWeekSubmitted && r.status !== 'COMPLETED' && (
                                <div className="mt-1 text-[11px] text-emerald-600">✓ this week filed</div>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top text-right">
                              <button
                                type="button"
                                onClick={() => setExpanded(isOpen ? null : r.sipId)}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                {isOpen ? <FiChevronUp className="h-3.5 w-3.5" /> : <FiChevronDown className="h-3.5 w-3.5" />}
                                {isOpen ? 'Hide' : 'View'}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-gray-50/50">
                              <td colSpan={8} className="px-4 py-4">
                                <DrillDown sipId={r.sipId} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SIPMonitorPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
