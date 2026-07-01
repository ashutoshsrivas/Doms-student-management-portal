'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiBriefcase, FiCalendar, FiCheckCircle, FiClock, FiExternalLink, FiSearch, FiUser, FiUsers } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Student = { id: string; firstName: string | null; lastName: string | null; email: string };

type WeeklyUpdate = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  statusText: string;
  submitted: boolean;
  submittedAt: string | null;
};

type SIP = {
  id: string;
  status: 'PENDING' | 'COMPLETED' | string;
  enrollmentNo?: string | null;
  studentName?: string | null;
  specialization?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  companyName?: string | null;
  jobRole?: string | null;
  sipLocation?: string | null;
  stipend?: number | string | null;
  joinDate?: string | null;
  nocDate?: string | null;
  completionDate?: string | null;
  durationWeeks?: number | string | null;
  supervisorName?: string | null;
  supervisorPhone?: string | null;
  supervisorEmail?: string | null;
  hrHeadName?: string | null;
  hrPhone?: string | null;
  hrEmail?: string | null;
  projectTitle?: string | null;
  facultyMentorName?: string | null;
  certificateIssued?: string | null;
  facultyFeedback?: string | null;
  supervisorFeedback?: string | null;
  facultyGrading?: number | string | null;
  supervisorGrading?: number | string | null;
  ppOffered?: boolean | null;
  ppoCompensation?: number | string | null;
  ppoPosition?: string | null;
  ppoLocation?: string | null;
};

type Mentee = {
  studentSessionId: string;
  student: Student | null;
  sip: SIP | null;
  weeklyUpdates: WeeklyUpdate[];
};

type Team = {
  teamId: string;
  teamName: string;
  status: string;
  session: { id: string; name: string; sipEnabled: boolean } | null;
  faculty: { id: string; name: string; email: string } | null;
  mentees: Mentee[];
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

const studentLabel = (s: Student | null) =>
  s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email : 'Unknown student';

function StatusPill({ sip }: { sip: SIP | null }) {
  if (!sip) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        <FiClock className="h-3 w-3" /> Not started
      </span>
    );
  }
  if (sip.status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <FiCheckCircle className="h-3 w-3" /> Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <FiClock className="h-3 w-3" /> In progress
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 break-words">{value ?? '—'}</div>
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

function SIPDetail({ sip }: { sip: SIP }) {
  return (
    <div className="mt-4 space-y-6">
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
          {sip.ppOffered ? (
            <>
              <Field label="PPO compensation" value={sip.ppoCompensation ? `₹ ${sip.ppoCompensation}` : null} />
              <Field label="PPO position" value={sip.ppoPosition} />
              <Field label="PPO location" value={sip.ppoLocation} />
            </>
          ) : null}
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
  );
}

function WeeklyTimeline({ updates }: { updates: WeeklyUpdate[] }) {
  if (!updates.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No weekly updates submitted yet.
      </div>
    );
  }
  return (
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
  );
}

function MenteeCard({ mentee }: { mentee: Mentee }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'form' | 'updates'>('form');
  const name = studentLabel(mentee.student);
  const updatesCount = mentee.weeklyUpdates.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FiUser className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
            <div className="truncate text-xs text-gray-500">{mentee.student?.email || '—'}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-gray-500 sm:inline">
            {updatesCount} weekly {updatesCount === 1 ? 'update' : 'updates'}
          </span>
          <StatusPill sip={mentee.sip} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
          {!mentee.sip ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              This mentee hasn&apos;t started a SIP form for the current session.
            </div>
          ) : (
            <>
              <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm">
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
                  Weekly updates ({updatesCount})
                </button>
              </div>
              {tab === 'form' ? <SIPDetail sip={mentee.sip} /> : <WeeklyTimeline updates={mentee.weeklyUpdates} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Content() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await apiClient.get('/sip/my-mentees');
        if (!cancelled) setTeams(Array.isArray(data?.teams) ? data.teams : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load mentees');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const allMentees = teams.flatMap((t) => t.mentees);
    return {
      teams: teams.length,
      mentees: allMentees.length,
      withSip: allMentees.filter((m) => m.sip).length,
      completed: allMentees.filter((m) => m.sip?.status === 'COMPLETED').length,
    };
  }, [teams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams
      .map((t) => ({
        ...t,
        mentees: t.mentees.filter((m) => {
          const name = studentLabel(m.student).toLowerCase();
          const email = (m.student?.email || '').toLowerCase();
          const company = (m.sip?.companyName || '').toLowerCase();
          return name.includes(q) || email.includes(q) || company.includes(q);
        }),
      }))
      .filter((t) => t.mentees.length > 0);
  }, [teams, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mentees&apos; SIP</h1>
          <p className="mt-1 text-sm text-gray-500">
            Read-only view of your mentees&apos; Summer Internship Programme forms and weekly updates.
          </p>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mentee, email, company…"
            className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: 'Teams', v: totals.teams, icon: <FiUsers className="h-4 w-4" /> },
          { k: 'Mentees', v: totals.mentees, icon: <FiUser className="h-4 w-4" /> },
          { k: 'With SIP form', v: totals.withSip, icon: <FiBriefcase className="h-4 w-4" /> },
          { k: 'Completed', v: totals.completed, icon: <FiCheckCircle className="h-4 w-4" /> },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              <span className="text-gray-400">{s.icon}</span>
              {s.k}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{s.v}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Loading mentees…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
          <FiUsers className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">
            {query ? 'No mentees match your search.' : 'You don’t have any mentees yet.'}
          </p>
          {!query && (
            <p className="mt-1 text-xs text-gray-500">
              An admin assigns mentees by adding you as a Faculty on a Mentor Team.
            </p>
          )}
        </div>
      )}

      <div className="space-y-6">
        {filtered.map((team) => (
          <section key={team.teamId} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{team.teamName}</h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {team.session?.name && (
                    <span className="inline-flex items-center gap-1">
                      <FiCalendar className="h-3 w-3" /> {team.session.name}
                    </span>
                  )}
                  <span className="text-gray-300">•</span>
                  <span>{team.mentees.length} {team.mentees.length === 1 ? 'mentee' : 'mentees'}</span>
                </div>
              </div>
              {team.session && !team.session.sipEnabled && (
                <span className="rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                  SIP not enabled on this session
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {team.mentees.map((m) => (
                <MenteeCard key={m.studentSessionId} mentee={m} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function MenteesSIPPage() {
  return (
    <ProtectedRoute requiredRoles={['FACULTY', 'CHAIR_HEAD', 'MENTOR', 'HOD', 'ADMIN', 'PLACEMENT_COORDINATOR']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
