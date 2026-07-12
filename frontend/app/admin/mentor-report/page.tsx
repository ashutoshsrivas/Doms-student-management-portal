'use client';

// Complete mentor–mentee coverage report. Renders live and is designed
// to print cleanly (Save-as-PDF from browser). Everything sits on one
// scroll — sections are separated with `page-break-before: always` for
// print.

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FiPrinter, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiUsers, FiFlag, FiClock, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

type Flag = 'red' | 'yellow' | 'green' | 'completed' | 'not-started';

interface Rollup {
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  facultyRole: string;
  facultyDepartment?: string | null;
  teams: string[];
  total: number;
  red: number;
  yellow: number;
  green: number;
  completed: number;
  notStarted: number;
  greenRate: number;
  redRate: number;
  distinctCompanies: number;
}

interface Mentee {
  facultyId: string;
  facultyName: string;
  facultyRole: string;
  teamName: string;
  menteeId: string;
  menteeName: string;
  menteeEmail: string;
  sipStatus?: string | null;
  sipType?: string | null;
  companyName?: string | null;
  jobRole?: string | null;
  joinDate?: string | null;
  durationWeeks?: number | null;
  updatesSubmitted: number;
  flag: Flag;
}

interface Unassigned {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  employee_id: string | null;
  approved_role: string;
  department: string | null;
}

interface ReportData {
  session: { id: string; name: string; isActive: boolean };
  generatedAt: string;
  totals: {
    eligibleMentors: number;
    mentorsAssigned: number;
    activeTeams: number;
    assignedMentees: number;
    studentsInSession: number;
    orphanStudents: number;
    flags: Record<Flag, number>;
  };
  unassigned: Unassigned[];
  unassignedByRole: Record<string, number>;
  assignedByRole: Record<string, number>;
  teamStats: { min: number; max: number; median: number; avg: number };
  sipTypes: Record<string, number>;
  withSip: number;
  distinctCompanies: number;
  facultyRollup: Rollup[];
  mentees: Mentee[];
  insights: { topGreen: Rollup[]; topRed: Rollup[]; largestTeams: Rollup[] };
}

const FLAG_COLOR: Record<Flag, { chip: string; dot: string; label: string }> = {
  red:           { chip: 'bg-red-100 text-red-800',       dot: 'bg-red-500',    label: 'No updates' },
  yellow:        { chip: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500',  label: 'Behind' },
  green:         { chip: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', label: 'On track' },
  completed:     { chip: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500',   label: 'Completed' },
  'not-started': { chip: 'bg-gray-200 text-gray-700',     dot: 'bg-gray-400',   label: 'Not started' },
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', HOD: 'HOD', FACULTY: 'Faculty',
  CHAIR_HEAD: 'Chair Head', COORDINATOR: 'Coordinator',
  PLACEMENT_COORDINATOR: 'Placement Coord.',
  TRAINER: 'Trainer', MENTOR: 'Mentor',
};

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export default function MentorReportPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HOD';

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/mentor-report');
      setData(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!data) return;
    const header = ['Faculty', 'Role', 'Team', 'Mentee', 'Email', 'SIP Status', 'Company', 'Join Date', 'Duration (wks)', 'Updates', 'Flag'];
    const rows = data.mentees.map((m) => [
      m.facultyName, m.facultyRole, m.teamName,
      m.menteeName, m.menteeEmail,
      m.sipStatus || 'NO SIP',
      m.companyName || '',
      m.joinDate ? new Date(m.joinDate).toISOString().slice(0, 10) : '',
      m.durationWeeks ?? '',
      m.updatesSubmitted,
      FLAG_COLOR[m.flag].label,
    ]);
    const csv = [header, ...rows].map((r) =>
      r.map((v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mentor-report-${data.session.name.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const coverageRate = useMemo(() => {
    if (!data) return 0;
    return pct(data.totals.assignedMentees, data.totals.studentsInSession);
  }, [data]);

  if (!user || !isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 text-gray-500">Loading…</div>
      </DashboardLayout>
    );
  }
  if (loading || !data) {
    return (
      <DashboardLayout>
        <div className="p-6 text-gray-500">Loading report…</div>
      </DashboardLayout>
    );
  }

  const t = data.totals;
  const flags = t.flags;
  const total = t.assignedMentees;

  return (
    <DashboardLayout>
      {/* Print styles + hide chrome on print */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: #fff !important; }
          .no-print, .no-print * { display: none !important; }
          .report-root { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .print-page-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid; }
          .print-full-width { max-width: 100% !important; }
        }
      `}</style>

      <div className="report-root p-4 sm:p-6 max-w-[1200px] mx-auto">
        {/* Toolbar — hidden on print */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mentor–Mentee Report</h1>
            <p className="text-sm text-gray-500">
              {data.session.name}
              {data.session.isActive ? ' (active)' : ''}
              {' · '}
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <FiDownload className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <FiPrinter className="w-4 h-4" /> Save as PDF
            </button>
          </div>
        </div>

        {/* Report header (visible in print too) */}
        <div className="mb-4 pb-3 border-b border-gray-200">
          <div className="text-xs uppercase tracking-wide text-gray-500">Mentor–Mentee Report</div>
          <div className="text-lg font-semibold text-gray-900">{data.session.name}</div>
          <div className="text-xs text-gray-500">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </div>
        </div>

        {/* Section 1: KPIs */}
        <section className="print-avoid-break mb-6">
          <h2 className="text-sm uppercase tracking-wide font-semibold text-gray-500 mb-2">
            Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Students in session" value={t.studentsInSession} />
            <Stat label="Assigned mentees" value={t.assignedMentees} sub={`${coverageRate}% coverage`} />
            <Stat label="Orphan students" value={t.orphanStudents} highlight={t.orphanStudents > 0 ? 'warn' : undefined} />
            <Stat label="Eligible mentors" value={t.eligibleMentors} />
            <Stat label="Mentors assigned" value={t.mentorsAssigned} sub={`${t.eligibleMentors - t.mentorsAssigned} idle`} />
            <Stat label="Active teams" value={t.activeTeams} />
          </div>
        </section>

        {/* Section 2: Flag distribution */}
        <section className="print-avoid-break mb-6">
          <h2 className="text-sm uppercase tracking-wide font-semibold text-gray-500 mb-2">
            SIP flag distribution ({total} mentees)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            <FlagStat flag="red" count={flags.red} total={total} />
            <FlagStat flag="yellow" count={flags.yellow} total={total} />
            <FlagStat flag="green" count={flags.green} total={total} />
            <FlagStat flag="completed" count={flags.completed} total={total} />
            <FlagStat flag="not-started" count={flags['not-started']} total={total} />
          </div>
          {/* Horizontal stacked bar */}
          <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
            {(['red', 'yellow', 'green', 'completed', 'not-started'] as Flag[]).map((f) => {
              const c = flags[f];
              if (!c) return null;
              const width = `${pct(c, total)}%`;
              const cls = f === 'red' ? 'bg-red-500' :
                          f === 'yellow' ? 'bg-amber-500' :
                          f === 'green' ? 'bg-emerald-500' :
                          f === 'completed' ? 'bg-blue-500' : 'bg-gray-400';
              return <div key={f} className={cls} style={{ width }} title={`${FLAG_COLOR[f].label}: ${c}`} />;
            })}
          </div>
        </section>

        {/* Section 3: Team-size stats */}
        <section className="print-avoid-break mb-6">
          <h2 className="text-sm uppercase tracking-wide font-semibold text-gray-500 mb-2">
            Team size & data quality
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Avg team size" value={data.teamStats.avg} />
            <Stat label="Median team size" value={data.teamStats.median} />
            <Stat label="Smallest / largest team" value={`${data.teamStats.min} / ${data.teamStats.max}`} />
            <Stat label="Distinct companies (mentees)" value={data.distinctCompanies} />
          </div>
          <div className="mt-3 text-xs text-gray-500">
            SIP filed by <b>{data.withSip}</b> of {total} assigned mentees
            ({pct(data.withSip, total)}%).
            SIP type breakdown:{' '}
            {Object.entries(data.sipTypes).map(([k, v]) => (
              <span key={k} className="inline-block mr-2">
                <b>{v}</b> {k.toLowerCase().replace('_', ' ')}
              </span>
            ))}
          </div>
        </section>

        {/* Section 4: Insights */}
        <section className="print-avoid-break mb-8">
          <h2 className="text-sm uppercase tracking-wide font-semibold text-gray-500 mb-2">
            Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard title="Largest teams" rows={data.insights.largestTeams} format={(r) => `${r.total} mentees`} />
            <InsightCard title="Most red flags" rows={data.insights.topRed} format={(r) => `${r.red} red / ${r.total}`} />
            <InsightCard title="Strongest green rate (≥3 mentees)" rows={data.insights.topGreen} format={(r) => `${r.greenRate}% green (${r.green}/${r.total})`} />
          </div>
        </section>

        {/* Section 5: Unassigned faculty */}
        <section className="print-page-break print-avoid-break mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Faculties without any mentees ({data.unassigned.length})
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Roles: {Object.entries(data.unassignedByRole).map(([r, n]) => `${ROLE_LABEL[r] || r} (${n})`).join(' · ') || '—'}
          </p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Employee ID</Th>
                  <Th>Department</Th>
                  <Th>Email</Th>
                </tr>
              </thead>
              <tbody>
                {data.unassigned.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <Td className="font-medium">{u.first_name} {u.last_name || ''}</Td>
                    <Td><Chip>{ROLE_LABEL[u.approved_role] || u.approved_role}</Chip></Td>
                    <Td>{u.employee_id || '—'}</Td>
                    <Td>{u.department || '—'}</Td>
                    <Td className="text-gray-600">{u.email}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6: Per-faculty roll-up */}
        <section className="print-page-break mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Per-faculty roll-up ({data.facultyRollup.length})
          </h2>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Faculty</Th>
                  <Th>Role</Th>
                  <Th>Team(s)</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">🔴</Th>
                  <Th className="text-right">🟡</Th>
                  <Th className="text-right">🟢</Th>
                  <Th className="text-right">⏳</Th>
                  <Th className="text-right">Green %</Th>
                  <Th className="text-right">Red %</Th>
                </tr>
              </thead>
              <tbody>
                {data.facultyRollup.map((f) => (
                  <tr key={f.facultyId} className="border-t border-gray-100">
                    <Td>
                      <div className="font-medium">{f.facultyName}</div>
                      <div className="text-[11px] text-gray-500">{f.facultyEmail}</div>
                    </Td>
                    <Td><Chip>{ROLE_LABEL[f.facultyRole] || f.facultyRole}</Chip></Td>
                    <Td className="text-gray-600 text-xs">{f.teams.join(', ')}</Td>
                    <Td className="text-right font-semibold">{f.total}</Td>
                    <Td className="text-right text-red-700">{f.red}</Td>
                    <Td className="text-right text-amber-700">{f.yellow}</Td>
                    <Td className="text-right text-emerald-700">{f.green}</Td>
                    <Td className="text-right text-gray-600">{f.notStarted}</Td>
                    <Td className="text-right">{f.greenRate}%</Td>
                    <Td className="text-right">{f.redRate}%</Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <Td colSpan={3}>Totals</Td>
                  <Td className="text-right">{total}</Td>
                  <Td className="text-right text-red-700">{flags.red}</Td>
                  <Td className="text-right text-amber-700">{flags.yellow}</Td>
                  <Td className="text-right text-emerald-700">{flags.green}</Td>
                  <Td className="text-right text-gray-600">{flags['not-started']}</Td>
                  <Td className="text-right">{pct(flags.green, total)}%</Td>
                  <Td className="text-right">{pct(flags.red, total)}%</Td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 7: Per-mentee detail — grouped by faculty */}
        <section className="print-page-break">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Full mentee list ({data.mentees.length})
          </h2>
          {data.facultyRollup.map((f) => {
            const list = data.mentees.filter((m) => m.facultyId === f.facultyId);
            return (
              <div key={f.facultyId} className="mb-5 print-avoid-break">
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{f.facultyName}</h3>
                  <Chip>{ROLE_LABEL[f.facultyRole] || f.facultyRole}</Chip>
                  <span className="text-xs text-gray-500">
                    {f.teams.join(', ')} · {f.total} mentees · 🔴 {f.red} · 🟡 {f.yellow} · 🟢 {f.green} · ⏳ {f.notStarted}
                  </span>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <Th>Mentee</Th>
                        <Th>Company</Th>
                        <Th>Join date</Th>
                        <Th className="text-right">Wks</Th>
                        <Th className="text-right">Updates</Th>
                        <Th>Flag</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((m) => (
                        <tr key={m.menteeId} className="border-t border-gray-100">
                          <Td>
                            <div className="font-medium">{m.menteeName}</div>
                            <div className="text-[11px] text-gray-500">{m.menteeEmail}</div>
                          </Td>
                          <Td className="text-gray-700">{m.companyName || <span className="text-gray-400">—</span>}</Td>
                          <Td className="text-gray-700">{fmtDate(m.joinDate)}</Td>
                          <Td className="text-right text-gray-700">{m.durationWeeks ?? '—'}</Td>
                          <Td className="text-right text-gray-700">{m.updatesSubmitted}</Td>
                          <Td>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${FLAG_COLOR[m.flag].chip}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${FLAG_COLOR[m.flag].dot}`} />
                              {FLAG_COLOR[m.flag].label}
                            </span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>

        <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
          Report generated on {new Date(data.generatedAt).toLocaleString()} · doms.geu.ac.in
        </footer>
      </div>
    </DashboardLayout>
  );
}

// ---- Small building blocks --------------------------------------------

function Stat({ label, value, sub, highlight }: {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: 'warn';
}) {
  return (
    <div className={`rounded-xl border p-3 ${highlight === 'warn' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900 mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function FlagStat({ flag, count, total }: { flag: Flag; count: number; total: number }) {
  const c = FLAG_COLOR[flag];
  const p = pct(count, total);
  return (
    <div className="rounded-xl border border-gray-200 p-3 bg-white">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{c.label}</span>
      </div>
      <div className="text-xl font-semibold text-gray-900 mt-0.5">{count}</div>
      <div className="text-[11px] text-gray-500">{p}%</div>
    </div>
  );
}

function InsightCard({ title, rows, format }: {
  title: string;
  rows: Rollup[];
  format: (r: Rollup) => string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{title}</div>
      <ol className="space-y-1">
        {rows.map((r, i) => (
          <li key={r.facultyId} className="text-sm text-gray-800 flex items-baseline gap-2">
            <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
            <span className="font-medium flex-1 truncate">{r.facultyName}</span>
            <span className="text-xs text-gray-500">{format(r)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-3 py-2 font-medium text-gray-600 ${className || ''}`}>{children}</th>;
}
function Td({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-3 py-2 align-top ${className || ''}`}>{children}</td>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{children}</span>;
}
