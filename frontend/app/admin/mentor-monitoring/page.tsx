'use client';

// Mentor activity monitoring — read-only oversight of every mentor team's
// requirements and student responses. Accessible to ADMIN, HOD, and the
// new CHAIR_HEAD role.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiLoader, FiSearch, FiChevronRight, FiChevronDown,
  FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiFileText,
  FiDownload, FiExternalLink, FiCalendar,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

const ALLOWED_ROLES = ['ADMIN', 'HOD', 'CHAIR_HEAD'];

interface MStudent { id: string; name: string; email: string }
interface MResponse {
  id: string;
  status: string;
  feedback: string | null;
  fileUrl: string | null;
  text: string | null;
  submittedAt: string | null;
  respondedAt: string | null;
  student: MStudent | null;
}
interface MRequirement {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  memberCount: number;
  responseCount: number;
  pendingCount: number;
  responses: MResponse[];
}
interface MTeamRow {
  team: {
    id: string;
    teamName: string;
    description: string | null;
    status: string;
    createdAt: string;
    Faculty?: { id: string; firstName: string; lastName: string; email: string; approvedRole: string };
    AcademicSession?: { id: string; name: string };
    memberCount: number;
    members: { id: string; student: MStudent | null }[];
  };
  requirements: MRequirement[];
  totals: { requirements: number; responses: number; pendingResponses: number };
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString() : '—';

export default function MentorMonitoringPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [rows, setRows] = useState<MTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set());
  const [openReqs, setOpenReqs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    if (!ALLOWED_ROLES.includes(user.role)) router.push('/dashboard');
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/mentor/monitoring');
      setRows(res.data.teams || []);
      // Auto-expand all team rows on first load so the user sees activity
      // without an extra click.
      setOpenTeams(new Set((res.data.teams || []).map((r: MTeamRow) => r.team.id)));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load mentor activity');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const fname = r.team.Faculty ? `${r.team.Faculty.firstName} ${r.team.Faculty.lastName}`.toLowerCase() : '';
      return r.team.teamName.toLowerCase().includes(q) ||
        fname.includes(q) ||
        (r.team.AcademicSession?.name || '').toLowerCase().includes(q);
    });
  }, [rows, search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        teams: acc.teams + 1,
        members: acc.members + r.team.memberCount,
        requirements: acc.requirements + r.totals.requirements,
        responses: acc.responses + r.totals.responses,
        pendingResponses: acc.pendingResponses + r.totals.pendingResponses,
      }),
      { teams: 0, members: 0, requirements: 0, responses: 0, pendingResponses: 0 },
    );
  }, [rows]);

  const toggleTeam = (id: string) => {
    setOpenTeams((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleReq = (id: string) => {
    setOpenReqs((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Mentor Monitoring">
        <div className="min-h-[60vh] flex items-center justify-center">
          <FiLoader className="animate-spin text-blue-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mentor Monitoring">
      <div className="py-6 px-2 md:px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mentor Monitoring</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Read-only oversight of every mentor team — the requirements faculty/chair-head set, and how each student responded.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
          >
            <FiArrowLeft /> Back
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <StatCard label="Teams" value={totals.teams} />
          <StatCard label="Members" value={totals.members} />
          <StatCard label="Requirements" value={totals.requirements} />
          <StatCard label="Responses" value={totals.responses} tone="text-green-700" />
          <StatCard label="Pending" value={totals.pendingResponses} tone={totals.pendingResponses > 0 ? 'text-red-700' : 'text-gray-600'} />
        </div>

        {/* Search */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 mb-4 flex items-center gap-2">
          <FiSearch className="text-gray-400 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by team name, faculty, or session…"
            className="flex-1 px-2 py-1.5 text-sm text-gray-900 outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
            <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
            No mentor teams found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const teamOpen = openTeams.has(r.team.id);
              return (
                <div key={r.team.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  {/* Team header */}
                  <button
                    onClick={() => toggleTeam(r.team.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {teamOpen ? <FiChevronDown className="text-gray-500" /> : <FiChevronRight className="text-gray-500" />}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{r.team.teamName}</p>
                        <p className="text-xs text-gray-600 truncate">
                          <FiUsers size={11} className="inline mr-1" />
                          {r.team.Faculty
                            ? `${r.team.Faculty.firstName} ${r.team.Faculty.lastName} (${r.team.Faculty.approvedRole})`
                            : '—'}
                          {r.team.AcademicSession ? ` · ${r.team.AcademicSession.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <Chip icon={<FiUsers size={11} />} label={`${r.team.memberCount} members`} />
                      <Chip icon={<FiFileText size={11} />} label={`${r.totals.requirements} reqs`} />
                      <Chip icon={<FiCheckCircle size={11} />} label={`${r.totals.responses} resp`} tone="bg-green-50 text-green-800 border-green-200" />
                      {r.totals.pendingResponses > 0 && (
                        <Chip icon={<FiClock size={11} />} label={`${r.totals.pendingResponses} pending`} tone="bg-red-50 text-red-800 border-red-200" />
                      )}
                    </div>
                  </button>

                  {/* Team body */}
                  {teamOpen && (
                    <div className="border-t border-gray-200 p-3 md:p-4 bg-gray-50 space-y-3">
                      {/* Members chips */}
                      {r.team.members.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase font-bold text-gray-500 mb-1">Members</p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.team.members.map((m) => (
                              <span key={m.id} className="px-2 py-0.5 text-[11px] bg-white border border-gray-200 rounded text-gray-700">
                                {m.student?.name || '—'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Requirements */}
                      {r.requirements.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">— No requirements yet.</p>
                      ) : (
                        <div>
                          <p className="text-[11px] uppercase font-bold text-gray-500 mb-1">Requirements</p>
                          <div className="space-y-2">
                            {r.requirements.map((req) => {
                              const reqOpen = openReqs.has(req.id);
                              const overdue = req.dueDate && new Date(req.dueDate).getTime() < Date.now() && req.pendingCount > 0;
                              return (
                                <div key={req.id} className="bg-white border border-gray-200 rounded">
                                  <button
                                    onClick={() => toggleReq(req.id)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {reqOpen ? <FiChevronDown size={14} className="text-gray-500" /> : <FiChevronRight size={14} className="text-gray-500" />}
                                      <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{req.title}</p>
                                        <p className="text-[11px] text-gray-600">
                                          {req.dueDate ? (
                                            <span className={overdue ? 'text-red-700 font-semibold' : ''}>
                                              <FiCalendar size={10} className="inline mr-1" />Due {fmtDate(req.dueDate)}
                                            </span>
                                          ) : '—'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] shrink-0">
                                      <Chip label={`${req.responseCount}/${req.memberCount} responded`} tone={req.pendingCount === 0 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'} />
                                      {req.pendingCount > 0 && (
                                        <Chip label={`${req.pendingCount} pending`} tone="bg-red-50 text-red-700 border-red-200" />
                                      )}
                                    </div>
                                  </button>

                                  {reqOpen && (
                                    <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3">
                                      {req.description && (
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.description}</p>
                                      )}

                                      {/* Responses */}
                                      {req.responses.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic">— No student responses yet.</p>
                                      ) : (
                                        <ul className="space-y-2">
                                          {req.responses.map((rp) => (
                                            <li key={rp.id} className="bg-white border border-gray-200 rounded p-2.5 text-sm">
                                              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                                <span className="font-semibold text-gray-900">{rp.student?.name || '—'}</span>
                                                <span className="text-[11px] text-gray-500">
                                                  {rp.respondedAt ? `Responded ${fmtDateTime(rp.respondedAt)}` : (rp.submittedAt ? `Submitted ${fmtDateTime(rp.submittedAt)}` : '')}
                                                </span>
                                              </div>
                                              {rp.text && <p className="text-sm text-gray-800 whitespace-pre-wrap">{rp.text}</p>}
                                              {rp.fileUrl && (
                                                <a
                                                  href={rp.fileUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                                                >
                                                  <FiDownload size={12} /> Attached file <FiExternalLink size={10} />
                                                </a>
                                              )}
                                              {rp.feedback && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                  <p className="text-[11px] uppercase font-bold text-indigo-700">Faculty feedback</p>
                                                  <p className="text-sm text-indigo-900 mt-0.5 whitespace-pre-wrap">{rp.feedback}</p>
                                                </div>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold ${tone || 'text-gray-900'}`}>{value}</p>
      <p className="text-[11px] uppercase font-semibold text-gray-600">{label}</p>
    </div>
  );
}

function Chip({ icon, label, tone }: { icon?: React.ReactNode; label: string; tone?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold ${tone || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {icon}
      {label}
    </span>
  );
}
