'use client';

// Standalone printable version of the mentor-mentee report. No
// DashboardLayout wrapper -> no sidebar/header in the PDF. Auto-fires
// window.print() so the user just picks "Save as PDF".

import { useEffect, useState } from 'react';
import apiClient from '@/app/lib/apiClient';

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

export default function MentorReportPrintPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/mentor-report');
        setData(data);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load report');
      }
    })();
  }, []);

  // Auto-fire print once content is on screen
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => {
      try { window.print(); } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
  }, [data]);

  if (error) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#a00' }}>Error: {error}</div>;
  }
  if (!data) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading report…</div>;
  }

  const t = data.totals;
  const flags = t.flags;
  const total = t.assignedMentees;
  const coverage = pct(t.assignedMentees, t.studentsInSession);

  return (
    <>
      <style>{`
        :root { color-scheme: light; }
        html, body {
          margin: 0; padding: 0; background: #fff; color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { size: A4; margin: 14mm 12mm 16mm 12mm; }
        @media screen {
          body { background: #f1f5f9; padding: 32px 0; }
          .sheet { max-width: 900px; margin: 0 auto 24px; padding: 32px;
                   background: #fff; border-radius: 6px;
                   box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
          .toolbar { max-width: 900px; margin: 0 auto 20px; display: flex;
                     gap: 8px; justify-content: flex-end; }
          .toolbar button { padding: 8px 14px; font-size: 13px; border: 1px solid #cbd5e1;
                            background: #fff; border-radius: 6px; cursor: pointer; }
          .toolbar button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        }
        @media print {
          .toolbar { display: none !important; }
          .sheet { padding: 0; max-width: 100%; box-shadow: none; margin: 0; }
        }

        h1, h2, h3, h4 { color: #0f172a; margin: 0; }
        p { margin: 0; }

        .cover { text-align: center; padding: 32px 0 24px; page-break-after: always; }
        .cover .title { font-size: 28px; font-weight: 700; }
        .cover .sub { color: #475569; font-size: 13px; margin-top: 6px; }
        .cover .kpi-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 10px; max-width: 640px; margin: 28px auto 0;
        }
        .cover .kpi {
          border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;
          background: #f8fafc; text-align: left;
        }
        .cover .kpi .k { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
        .cover .kpi .v { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px; }

        section { margin-bottom: 20px; page-break-inside: auto; }
        section.big { page-break-before: always; }
        h2.section-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .section-sub { color: #64748b; font-size: 10px; margin-bottom: 8px; }
        .avoid-break { page-break-inside: avoid; }

        .grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

        .stat {
          border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;
          background: #fff;
        }
        .stat .k { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
        .stat .v { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px; }
        .stat .sub { font-size: 9px; color: #64748b; margin-top: 2px; }
        .stat.warn { border-color: #fcd34d; background: #fffbeb; }

        .flag-stat {
          border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;
          background: #fff;
        }
        .flag-stat .row { display: flex; align-items: center; gap: 6px; }
        .flag-stat .dot { width: 8px; height: 8px; border-radius: 50%; }
        .flag-stat .k   { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
        .flag-stat .v   { font-size: 15px; font-weight: 700; margin-top: 2px; }

        .bar { display: flex; height: 10px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }

        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        thead th { background: #f8fafc; color: #475569; text-align: left; padding: 6px 8px;
                   font-weight: 600; border-bottom: 1px solid #e2e8f0; }
        tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        tbody tr:last-child td { border-bottom: none; }
        tr.totals td { border-top: 1.5px solid #cbd5e1; background: #f8fafc; font-weight: 700; }
        .right { text-align: right; }

        .chip {
          display: inline-block; padding: 1px 8px; border-radius: 999px;
          background: #f1f5f9; color: #334155; font-size: 9px; font-weight: 600;
        }
        .flag-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700;
        }
        .flag-chip .dot { width: 6px; height: 6px; border-radius: 50%; }

        .faculty-group { margin-bottom: 12px; page-break-inside: avoid; }
        .faculty-head { display: flex; flex-wrap: wrap; align-items: baseline;
                        gap: 6px; margin-bottom: 4px; }
        .faculty-head .name { font-size: 12px; font-weight: 700; }
        .faculty-head .meta { font-size: 9px; color: #64748b; }

        .insight-card {
          border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #fff;
        }
        .insight-card .h { font-size: 9px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
        .insight-card ol { list-style: none; margin: 0; padding: 0; }
        .insight-card li { display: flex; align-items: baseline; gap: 6px;
                            font-size: 10px; padding: 2px 0; }
        .insight-card li .idx { color: #94a3b8; width: 14px; font-size: 9px; }
        .insight-card li .n   { flex: 1; font-weight: 600; }
        .insight-card li .v   { color: #64748b; font-size: 9px; }

        footer.doc-footer { border-top: 1px solid #e2e8f0; padding-top: 8px;
                            font-size: 9px; color: #64748b; margin-top: 20px; }

        @media print {
          thead { display: table-header-group; }
          tr    { page-break-inside: avoid; }
        }
      `}</style>

      <div className="toolbar">
        <button onClick={() => window.print()} className="primary">Save as PDF / Print</button>
        <button onClick={() => window.close()}>Close</button>
      </div>

      <div className="sheet">
        {/* Cover */}
        <div className="cover">
          <div className="title">Mentor–Mentee Report</div>
          <div className="sub">
            {data.session.name}{data.session.isActive ? ' · Active session' : ''}
            <br />
            Generated {new Date(data.generatedAt).toLocaleString()}
          </div>
          <div className="kpi-grid">
            <div className="kpi"><div className="k">Students in session</div><div className="v">{t.studentsInSession}</div></div>
            <div className="kpi"><div className="k">Assigned mentees</div><div className="v">{t.assignedMentees} ({coverage}%)</div></div>
            <div className="kpi"><div className="k">Students without mentor</div><div className="v">{t.studentsWithoutMentor}</div></div>
            <div className="kpi"><div className="k">Eligible mentors</div><div className="v">{t.eligibleMentors}</div></div>
            <div className="kpi"><div className="k">Mentors assigned</div><div className="v">{t.mentorsAssigned}</div></div>
            <div className="kpi"><div className="k">Active teams</div><div className="v">{t.activeTeams}</div></div>
          </div>
        </div>

        {/* Overview */}
        <section className="avoid-break">
          <h2 className="section-title">Overview</h2>
          <div className="grid-6">
            <Stat k="Students in session" v={t.studentsInSession} />
            <Stat k="Assigned mentees" v={t.assignedMentees} sub={`${coverage}% coverage`} />
            <Stat k="Students without mentor" v={t.studentsWithoutMentor} warn={t.studentsWithoutMentor > 0} />
            <Stat k="Eligible mentors" v={t.eligibleMentors} />
            <Stat k="Mentors assigned" v={t.mentorsAssigned} sub={`${t.eligibleMentors - t.mentorsAssigned} idle`} />
            <Stat k="Active teams" v={t.activeTeams} />
          </div>
        </section>

        {/* Flag distribution */}
        <section className="avoid-break">
          <h2 className="section-title">SIP flag distribution ({total} mentees)</h2>
          <div className="grid-5" style={{ marginBottom: 8 }}>
            {(['red', 'yellow', 'green', 'completed', 'not-started'] as Flag[]).map((f) => (
              <FlagStat key={f} flag={f} count={flags[f]} total={total} />
            ))}
          </div>
          <div className="bar">
            {(['red', 'yellow', 'green', 'completed', 'not-started'] as Flag[]).map((f) => {
              const c = flags[f];
              if (!c) return null;
              return (
                <div key={f} style={{
                  width: `${pct(c, total)}%`,
                  backgroundColor: FLAG_META[f].hex,
                }} />
              );
            })}
          </div>
        </section>

        {/* Team stats */}
        <section className="avoid-break">
          <h2 className="section-title">Team size &amp; data quality</h2>
          <div className="grid-4">
            <Stat k="Avg team size" v={data.teamStats.avg} />
            <Stat k="Median team size" v={data.teamStats.median} />
            <Stat k="Smallest / largest team" v={`${data.teamStats.min} / ${data.teamStats.max}`} />
            <Stat k="Distinct companies" v={data.distinctCompanies} />
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: '#475569' }}>
            SIP filed by <b>{data.withSip}</b> of {total} assigned mentees
            ({pct(data.withSip, total)}%). Types:
            {' '}
            {Object.entries(data.sipTypes).map(([k, v]) => (
              <span key={k} style={{ marginRight: 8 }}><b>{v}</b> {k.toLowerCase().replace('_', ' ')}</span>
            ))}
          </div>
        </section>

        {/* Highlights */}
        <section className="avoid-break">
          <h2 className="section-title">Highlights</h2>
          <div className="grid-3">
            <InsightCard title="Largest teams" rows={data.insights.largestTeams} format={(r) => `${r.total} mentees`} />
            <InsightCard title="Most red flags" rows={data.insights.topRed} format={(r) => `${r.red} red / ${r.total}`} />
            <InsightCard title="Strongest green rate (≥3 mentees)" rows={data.insights.topGreen} format={(r) => `${r.greenRate}% green (${r.green}/${r.total})`} />
          </div>
        </section>

        {/* Faculty without mentees */}
        <section className="big">
          <h2 className="section-title">Faculties without any mentees ({data.unassigned.length})</h2>
          <div className="section-sub">
            Roles: {Object.entries(data.unassignedByRole).map(([r, n]) => `${ROLE_LABEL[r] || r} (${n})`).join(' · ') || '—'}
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Employee ID</th>
                <th>Department</th><th>Email</th>
              </tr>
            </thead>
            <tbody>
              {data.unassigned.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.first_name} {u.last_name || ''}</td>
                  <td><span className="chip">{ROLE_LABEL[u.approved_role] || u.approved_role}</span></td>
                  <td>{u.employee_id || '—'}</td>
                  <td>{u.department || '—'}</td>
                  <td style={{ color: '#475569' }}>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Students without mentor */}
        <section className="big">
          <h2 className="section-title">Students without mentor ({data.studentsWithoutMentor.length})</h2>
          <div className="section-sub">
            Students enrolled in this session who are not part of any active mentor team.
          </div>
          {data.studentsWithoutMentor.length === 0 ? (
            <div style={{
              padding: 12, background: '#ecfdf5', border: '1px solid #a7f3d0',
              borderRadius: 6, color: '#065f46', fontSize: 11,
            }}>
              Every student in this session has been assigned to a mentor.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Registration No.</th><th>Department</th>
                  <th>Phone</th><th>Email</th><th>Enrolment</th>
                </tr>
              </thead>
              <tbody>
                {data.studentsWithoutMentor.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name || ''}</td>
                    <td>{s.registration_number || '—'}</td>
                    <td>{s.department || '—'}</td>
                    <td>{s.phone_number || '—'}</td>
                    <td style={{ color: '#475569' }}>{s.email}</td>
                    <td><span className="chip">{s.enrollment_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Per-faculty rollup */}
        <section className="big">
          <h2 className="section-title">Per-faculty roll-up ({data.facultyRollup.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Faculty</th><th>Role</th><th>Team(s)</th>
                <th className="right">Total</th>
                <th className="right">Red</th>
                <th className="right">Yellow</th>
                <th className="right">Green</th>
                <th className="right">Not started</th>
                <th className="right">Green %</th>
                <th className="right">Red %</th>
              </tr>
            </thead>
            <tbody>
              {data.facultyRollup.map((f) => (
                <tr key={f.facultyId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.facultyName}</div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{f.facultyEmail}</div>
                  </td>
                  <td><span className="chip">{ROLE_LABEL[f.facultyRole] || f.facultyRole}</span></td>
                  <td style={{ fontSize: 9, color: '#475569' }}>{f.teams.join(', ')}</td>
                  <td className="right" style={{ fontWeight: 700 }}>{f.total}</td>
                  <td className="right" style={{ color: FLAG_META.red.hex }}>{f.red}</td>
                  <td className="right" style={{ color: FLAG_META.yellow.hex }}>{f.yellow}</td>
                  <td className="right" style={{ color: FLAG_META.green.hex }}>{f.green}</td>
                  <td className="right" style={{ color: '#475569' }}>{f.notStarted}</td>
                  <td className="right">{f.greenRate}%</td>
                  <td className="right">{f.redRate}%</td>
                </tr>
              ))}
              <tr className="totals">
                <td colSpan={3}>Totals</td>
                <td className="right">{total}</td>
                <td className="right" style={{ color: FLAG_META.red.hex }}>{flags.red}</td>
                <td className="right" style={{ color: FLAG_META.yellow.hex }}>{flags.yellow}</td>
                <td className="right" style={{ color: FLAG_META.green.hex }}>{flags.green}</td>
                <td className="right" style={{ color: '#475569' }}>{flags['not-started']}</td>
                <td className="right">{pct(flags.green, total)}%</td>
                <td className="right">{pct(flags.red, total)}%</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Full mentee list grouped */}
        <section className="big">
          <h2 className="section-title">Full mentee list ({data.mentees.length})</h2>
          {data.facultyRollup.map((f) => {
            const list = data.mentees.filter((m) => m.facultyId === f.facultyId);
            return (
              <div key={f.facultyId} className="faculty-group">
                <div className="faculty-head">
                  <span className="name">{f.facultyName}</span>
                  <span className="chip">{ROLE_LABEL[f.facultyRole] || f.facultyRole}</span>
                  <span className="meta">
                    {f.teams.join(', ')} · {f.total} mentees · red {f.red} · yellow {f.yellow} · green {f.green} · not-started {f.notStarted}
                  </span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Mentee</th><th>Company</th><th>Join date</th>
                      <th className="right">Wks</th>
                      <th className="right">Updates</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => (
                      <tr key={m.menteeId}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.menteeName}</div>
                          <div style={{ fontSize: 9, color: '#64748b' }}>{m.menteeEmail}</div>
                        </td>
                        <td>{m.companyName || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        <td>{fmtDate(m.joinDate)}</td>
                        <td className="right">{m.durationWeeks ?? '—'}</td>
                        <td className="right">{m.updatesSubmitted}</td>
                        <td>
                          <span className="flag-chip" style={{
                            background: FLAG_META[m.flag].light,
                            color: FLAG_META[m.flag].hex,
                          }}>
                            <span className="dot" style={{ background: FLAG_META[m.flag].hex }} />
                            {FLAG_META[m.flag].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>

        <footer className="doc-footer">
          Report generated on {new Date(data.generatedAt).toLocaleString()} · doms.geu.ac.in
        </footer>
      </div>
    </>
  );
}

// ---- Small components ------------------------------------------------

function Stat({ k, v, sub, warn }: { k: string; v: number | string; sub?: string; warn?: boolean }) {
  return (
    <div className={`stat${warn ? ' warn' : ''}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function FlagStat({ flag, count, total }: { flag: Flag; count: number; total: number }) {
  const m = FLAG_META[flag];
  return (
    <div className="flag-stat">
      <div className="row">
        <span className="dot" style={{ background: m.hex }} />
        <span className="k">{m.label}</span>
      </div>
      <div className="v">{count}</div>
      <div className="k" style={{ marginTop: 0 }}>{pct(count, total)}%</div>
    </div>
  );
}

function InsightCard({ title, rows, format }: {
  title: string;
  rows: Rollup[];
  format: (r: Rollup) => string;
}) {
  return (
    <div className="insight-card">
      <div className="h">{title}</div>
      <ol>
        {rows.map((r, i) => (
          <li key={r.facultyId}>
            <span className="idx">{i + 1}.</span>
            <span className="n">{r.facultyName}</span>
            <span className="v">{format(r)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
