'use client';

// Complete mentor–mentee coverage report. Renders live and prints as a
// clean multi-page PDF via window.print(). All section-level print CSS
// lives in one <style> block below.

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FiPrinter, FiRefreshCw, FiDownload } from 'react-icons/fi';
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

interface StudentWithoutMentor {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  registration_number: string | null;
  phone_number: string | null;
  department: string | null;
  enrollment_status: string;
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
    studentsWithoutMentor: number;
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
  studentsWithoutMentor: StudentWithoutMentor[];
  insights: { topGreen: Rollup[]; topRed: Rollup[]; largestTeams: Rollup[] };
}

const FLAG_META: Record<Flag, { label: string; hex: string; light: string }> = {
  red:           { label: 'No updates',  hex: '#dc2626', light: '#fee2e2' },
  yellow:        { label: 'Behind',      hex: '#d97706', light: '#fef3c7' },
  green:         { label: 'On track',    hex: '#059669', light: '#d1fae5' },
  completed:     { label: 'Completed',   hex: '#2563eb', light: '#dbeafe' },
  'not-started': { label: 'Not started', hex: '#6b7280', light: '#f3f4f6' },
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
      FLAG_META[m.flag].label,
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
      {/* Print styles — targets a clean 2-column A4 report with strong
          typography, printed backgrounds, and predictable page breaks. */}
      <style jsx global>{`
        .report-root { color: #0f172a; }
        @media print {
          @page { size: A4; margin: 14mm 12mm 16mm 12mm; }
          html, body { background: #ffffff !important; }
          body { font-size: 10pt; }
          .no-print, .no-print * { display: none !important; }
          .app-shell-chrome, header, nav, aside, .sidebar { display: none !important; }
          .report-root {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            color: #0f172a !important;
          }
          /* Force backgrounds/colors to print (chips, flag dots, bars). */
          .report-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-page-break { page-break-before: always; break-before: page; }
          .print-avoid-break { page-break-inside: avoid; break-inside: avoid; }
          .print-hide { display: none !important; }
          h2, h3 { page-break-after: avoid; }
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .print-cover {
            display: flex !important;
            flex-direction: column;
            justify-content: center;
            min-height: 92vh;
            page-break-after: always;
            text-align: center;
          }
          .print-cover .print-cover-title { font-size: 26pt; font-weight: 700; margin-bottom: 6pt; }
          .print-cover .print-cover-sub { font-size: 12pt; color: #475569; margin-bottom: 24pt; }
          .print-cover .print-kpis {
            display: grid; grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 8pt; max-width: 640px; margin: 0 auto;
          }
        }
        /* Screen-only cover intro tucked away until printing. */
        .print-cover { display: none; }
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

        {/* Print-only cover page */}
        <div className="print-cover">
          <div className="print-cover-title">Mentor–Mentee Report</div>
          <div className="print-cover-sub">
            {data.session.name}
            {data.session.isActive ? ' · Active session' : ''}
            <br />
            Generated {new Date(data.generatedAt).toLocaleString()}
          </div>
          <div className="print-kpis">
            <MiniStat label="Students in session" value={t.studentsInSession} />
            <MiniStat label="Assigned mentees" value={`${t.assignedMentees} (${coverageRate}%)`} />
            <MiniStat label="Students without mentor" value={t.studentsWithoutMentor} />
            <MiniStat label="Eligible mentors" value={t.eligibleMentors} />
            <MiniStat label="Mentors assigned" value={t.mentorsAssigned} />
            <MiniStat label="Active teams" value={t.activeTeams} />
          </div>
        </div>

        {/* Screen header */}
        <div className="mb-4 pb-3 border-b border-gray-200 print-hide">
          <div className="text-xs uppercase tracking-wide text-gray-500">Mentor–Mentee Report</div>
          <div className="text-lg font-semibold text-gray-900">{data.session.name}</div>
          <div className="text-xs text-gray-500">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </div>
        </div>

        {/* Section 1: KPIs */}
        <section className="print-avoid-break mb-6">
          <SectionHead>Overview</SectionHead>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Students in session" value={t.studentsInSession} />
            <Stat label="Assigned mentees" value={t.assignedMentees} sub={`${coverageRate}% coverage`} />
            <Stat label="Students without mentor" value={t.studentsWithoutMentor} highlight={t.studentsWithoutMentor > 0 ? 'warn' : undefined} />
            <Stat label="Eligible mentors" value={t.eligibleMentors} />
            <Stat label="Mentors assigned" value={t.mentorsAssigned} sub={`${t.eligibleMentors - t.mentorsAssigned} idle`} />
            <Stat label="Active teams" value={t.activeTeams} />
          </div>
        </section>

        {/* Section 2: Flag distribution */}
        <section className="print-avoid-break mb-6">
          <SectionHead>SIP flag distribution ({total} mentees)</SectionHead>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            {(['red', 'yellow', 'green', 'completed', 'not-started'] as Flag[]).map((f) => (
              <FlagStat key={f} flag={f} count={flags[f]} total={total} />
            ))}
          </div>
          <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
            {(['red', 'yellow', 'green', 'completed', 'not-started'] as Flag[]).map((f) => {
              const c = flags[f];
              if (!c) return null;
              const w = pct(c, total);
              return (
                <div
                  key={f}
                  style={{ width: `${w}%`, backgroundColor: FLAG_META[f].hex }}
                  title={`${FLAG_META[f].label}: ${c} (${w}%)`}
                />
              );
            })}
          </div>
        </section>

        {/* Section 3: Team-size stats */}
        <section className="print-avoid-break mb-6">
          <SectionHead>Team size &amp; data quality</SectionHead>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Avg team size" value={data.teamStats.avg} />
            <Stat label="Median team size" value={data.teamStats.median} />
            <Stat label="Smallest / largest team" value={`${data.teamStats.min} / ${data.teamStats.max}`} />
            <Stat label="Distinct companies (mentees)" value={data.distinctCompanies} />
          </div>
          <div className="mt-3 text-xs text-gray-600">
            SIP filed by <b>{data.withSip}</b> of {total} assigned mentees ({pct(data.withSip, total)}%).
            {' '}Types:{' '}
            {Object.entries(data.sipTypes).map(([k, v]) => (
              <span key={k} className="inline-block mr-2">
                <b>{v}</b> {k.toLowerCase().replace('_', ' ')}
              </span>
            ))}
          </div>
        </section>

        {/* Section 4: Insights */}
        <section className="print-avoid-break mb-8">
          <SectionHead>Highlights</SectionHead>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard title="Largest teams" rows={data.insights.largestTeams} format={(r) => `${r.total} mentees`} />
            <InsightCard title="Most red flags" rows={data.insights.topRed} format={(r) => `${r.red} red / ${r.total}`} />
            <InsightCard title="Strongest green rate (≥3 mentees)" rows={data.insights.topGreen} format={(r) => `${r.greenRate}% green (${r.green}/${r.total})`} />
          </div>
        </section>

        {/* Section 5: Faculty without mentees */}
        <section className="print-page-break mb-8">
          <SectionTitle
            title={`Faculties without any mentees (${data.unassigned.length})`}
            sub={`Roles: ${Object.entries(data.unassignedByRole).map(([r, n]) => `${ROLE_LABEL[r] || r} (${n})`).join(' · ') || '—'}`}
          />
          <TableWrap>
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
          </TableWrap>
        </section>

        {/* Section 6: Students without mentor */}
        <section className="print-page-break mb-8">
          <SectionTitle
            title={`Students without mentor (${data.studentsWithoutMentor.length})`}
            sub="Students enrolled in this session who are not part of any active mentor team. Consider assigning them."
          />
          {data.studentsWithoutMentor.length === 0 ? (
            <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg text-emerald-800 text-sm">
              Every student in this session has been assigned to a mentor. 🎉
            </div>
          ) : (
            <TableWrap>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Name</Th>
                    <Th>Registration No.</Th>
                    <Th>Department</Th>
                    <Th>Phone</Th>
                    <Th>Email</Th>
                    <Th>Enrolment</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.studentsWithoutMentor.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <Td className="font-medium">{s.first_name} {s.last_name || ''}</Td>
                      <Td>{s.registration_number || '—'}</Td>
                      <Td>{s.department || '—'}</Td>
                      <Td>{s.phone_number || '—'}</Td>
                      <Td className="text-gray-600">{s.email}</Td>
                      <Td><Chip>{s.enrollment_status}</Chip></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </section>

        {/* Section 7: Per-faculty rollup */}
        <section className="print-page-break mb-8">
          <SectionTitle title={`Per-faculty roll-up (${data.facultyRollup.length})`} />
          <TableWrap>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Faculty</Th>
                  <Th>Role</Th>
                  <Th>Team(s)</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Red</Th>
                  <Th className="text-right">Yellow</Th>
                  <Th className="text-right">Green</Th>
                  <Th className="text-right">Not started</Th>
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
                    <Td className="text-right" style={{ color: FLAG_META.red.hex }}>{f.red}</Td>
                    <Td className="text-right" style={{ color: FLAG_META.yellow.hex }}>{f.yellow}</Td>
                    <Td className="text-right" style={{ color: FLAG_META.green.hex }}>{f.green}</Td>
                    <Td className="text-right text-gray-600">{f.notStarted}</Td>
                    <Td className="text-right">{f.greenRate}%</Td>
                    <Td className="text-right">{f.redRate}%</Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <Td colSpan={3}>Totals</Td>
                  <Td className="text-right">{total}</Td>
                  <Td className="text-right" style={{ color: FLAG_META.red.hex }}>{flags.red}</Td>
                  <Td className="text-right" style={{ color: FLAG_META.yellow.hex }}>{flags.yellow}</Td>
                  <Td className="text-right" style={{ color: FLAG_META.green.hex }}>{flags.green}</Td>
                  <Td className="text-right text-gray-600">{flags['not-started']}</Td>
                  <Td className="text-right">{pct(flags.green, total)}%</Td>
                  <Td className="text-right">{pct(flags.red, total)}%</Td>
                </tr>
              </tbody>
            </table>
          </TableWrap>
        </section>

        {/* Section 8: Full mentee detail grouped per-faculty */}
        <section className="print-page-break">
          <SectionTitle title={`Full mentee list (${data.mentees.length})`} />
          {data.facultyRollup.map((f) => {
            const list = data.mentees.filter((m) => m.facultyId === f.facultyId);
            return (
              <div key={f.facultyId} className="mb-5 print-avoid-break">
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{f.facultyName}</h3>
                  <Chip>{ROLE_LABEL[f.facultyRole] || f.facultyRole}</Chip>
                  <span className="text-xs text-gray-500">
                    {f.teams.join(', ')} · {f.total} mentees · red {f.red} · yellow {f.yellow} · green {f.green} · not-started {f.notStarted}
                  </span>
                </div>
                <TableWrap>
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
                          <Td><FlagChip flag={m.flag} /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
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

// ---- Building blocks --------------------------------------------------

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
      {children}
    </h2>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      {children}
    </div>
  );
}

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

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 6,
      padding: '8pt 10pt',
      textAlign: 'left',
      background: '#f8fafc',
    }}>
      <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

function FlagStat({ flag, count, total }: { flag: Flag; count: number; total: number }) {
  const meta = FLAG_META[flag];
  const p = pct(count, total);
  return (
    <div className="rounded-xl border border-gray-200 p-3 bg-white">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: meta.hex }}
        />
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{meta.label}</span>
      </div>
      <div className="text-xl font-semibold text-gray-900 mt-0.5">{count}</div>
      <div className="text-[11px] text-gray-500">{p}%</div>
    </div>
  );
}

function FlagChip({ flag }: { flag: Flag }) {
  const m = FLAG_META[flag];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: m.light, color: m.hex }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: m.hex }}
      />
      {m.label}
    </span>
  );
}

function InsightCard({ title, rows, format }: {
  title: string;
  rows: Rollup[];
  format: (r: Rollup) => string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 print-avoid-break">
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
function Td({ children, className, colSpan, style }: { children: React.ReactNode; className?: string; colSpan?: number; style?: React.CSSProperties }) {
  return <td colSpan={colSpan} style={style} className={`px-3 py-2 align-top ${className || ''}`}>{children}</td>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{children}</span>;
}
