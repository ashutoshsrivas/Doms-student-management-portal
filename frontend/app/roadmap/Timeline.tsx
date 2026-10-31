'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiTarget, FiFlag, FiBookOpen, FiAward, FiBriefcase, FiUsers, FiCalendar,
  FiStar, FiZap, FiCheckCircle, FiEdit2, FiMapPin,
} from 'react-icons/fi';
import { Milestone, SelfMilestone, daysUntil, fmtDate } from './types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  target: FiTarget,
  flag: FiFlag,
  book: FiBookOpen,
  award: FiAward,
  briefcase: FiBriefcase,
  users: FiUsers,
  calendar: FiCalendar,
  star: FiStar,
  zap: FiZap,
  check: FiCheckCircle,
};
const iconFor = (key: string) => ICONS[key] || FiTarget;

const dayMs = 86400000;
const toTime = (d: string | null | undefined) => {
  if (!d) return null;
  const t = new Date(`${String(d).slice(0, 10)}T00:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
};

type Hover = { label: string; days: number | null } | null;

export type TimelineProps = {
  startDate: string | null;
  endDate: string | null;
  goalTitle: string;
  milestones: Milestone[];
  selfMilestones: SelfMilestone[];
  onMilestone?: (m: Milestone) => void;
  onSelf?: (m: SelfMilestone) => void;
  studentLabel?: string;
};

const DaysBadge = ({ days, caption }: { days: number | null; caption: string }) => {
  const tone = days === null
    ? 'bg-gray-100 text-gray-600'
    : days < 0
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : days <= 14
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : 'bg-blue-50 text-blue-700 ring-blue-200';
  return (
    <div className={`rm-days rounded-2xl px-3 py-1.5 text-center shadow-sm ring-1 ${tone}`}>
      <div className="text-base font-bold leading-none tabular-nums">
        {days === null ? '—' : days < 0 ? `−${Math.abs(days)}` : days}
        <span className="ml-1 text-[11px] font-semibold">days</span>
      </div>
      <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide opacity-75">{caption}</div>
    </div>
  );
};

export default function Timeline({
  startDate, endDate, goalTitle, milestones, selfMilestones, onMilestone, onSelf, studentLabel,
}: TimelineProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hover, setHover] = useState<Hover>(null);
  const [mounted, setMounted] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    const t = setTimeout(() => setMounted(true), 40);
    return () => { mq.removeEventListener('change', apply); clearTimeout(t); };
  }, []);

  const start = toTime(startDate);
  const end = toTime(endDate);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // The range the rail spans: the session start to the goal date, stretched
  // if a milestone or today falls outside it.
  const axis = useMemo(() => {
    const dates = [
      start, end, today,
      ...milestones.map((m) => toTime(m.dueDate)),
      ...selfMilestones.map((m) => toTime(m.date)),
    ].filter((x): x is number => x !== null);
    if (dates.length === 0) return { from: today, to: today + 30 * dayMs };
    const from = Math.min(...dates);
    const to = Math.max(...dates);
    return { from, to: to === from ? from + 30 * dayMs : to };
  }, [start, end, today, milestones, selfMilestones]);

  const pct = (t: number | null) => {
    if (t === null) return 0;
    const span = axis.to - axis.from;
    return Math.max(0, Math.min(100, ((t - axis.from) / span) * 100));
  };

  const goalDays = daysUntil(endDate);
  const currentPct = pct(today);

  // Desktop: lanes keep pins that fall close together from overlapping.
  const laneFor = (items: { at: number }[], gap: number) => {
    const lanes: number[] = [];
    let lastLane = 0;
    items.forEach((item, i) => {
      if (i === 0) { lanes.push(0); lastLane = 0; return; }
      const prev = items[i - 1].at;
      if (item.at - prev < gap) { lastLane = (lastLane + 1) % 3; } else { lastLane = 0; }
      lanes.push(lastLane);
    });
    return lanes;
  };

  const staff = useMemo(() => {
    const list = [...milestones]
      .map((m) => ({ m, at: pct(toTime(m.dueDate)) }))
      .sort((a, b) => a.at - b.at);
    const lanes = laneFor(list, 10);
    return list.map((x, i) => ({ ...x, lane: lanes[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones, axis.from, axis.to]);

  const own = useMemo(() => {
    const list = [...selfMilestones]
      .map((m) => ({ m, at: pct(toTime(m.date)) }))
      .sort((a, b) => a.at - b.at);
    const lanes = laneFor(list, 10);
    return list.map((x, i) => ({ ...x, lane: lanes[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfMilestones, axis.from, axis.to]);

  const clearHover = () => setHover(null);

  // ── Mobile: one stop per row, in date order ───────────────────
  if (isMobile) {
    type Row =
      | { kind: 'start'; at: number }
      | { kind: 'here'; at: number }
      | { kind: 'goal'; at: number }
      | { kind: 'staff'; at: number; m: Milestone }
      | { kind: 'self'; at: number; m: SelfMilestone };

    const rows: Row[] = [
      { kind: 'start' as const, at: start ?? axis.from },
      ...milestones.map((m) => ({ kind: 'staff' as const, at: toTime(m.dueDate) ?? axis.from, m })),
      ...selfMilestones.map((m) => ({ kind: 'self' as const, at: toTime(m.date) ?? axis.from, m })),
      { kind: 'here' as const, at: today },
      { kind: 'goal' as const, at: end ?? axis.to },
    ].sort((a, b) => a.at - b.at || (a.kind === 'here' ? -1 : 0));

    const hereIndex = rows.findIndex((r) => r.kind === 'here');

    return (
      <div className="relative py-2">
        {/* the rail */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 top-6 w-1 -translate-x-1/2 rounded-full bg-gray-200" />
        <div
          className={`rm-progress-y pointer-events-none absolute left-1/2 top-6 w-1 -translate-x-1/2 rounded-full ${mounted ? 'rm-draw-y' : ''}`}
          style={{ height: `calc(${(Math.max(0, hereIndex) / Math.max(1, rows.length - 1)) * 100}% - 1.5rem)` }}
        />

        <ul className="relative space-y-3">
          {rows.map((row, i) => {
            if (row.kind === 'start' || row.kind === 'goal') {
              const isGoal = row.kind === 'goal';
              return (
                <li key={row.kind} className="relative flex justify-center" style={{ animationDelay: `${i * 45}ms` }}>
                  <div className={`${mounted ? 'rm-pop' : 'opacity-0'} flex flex-col items-center`} style={{ animationDelay: `${i * 45}ms` }}>
                    {isGoal ? (
                      <div className="rm-flag flex flex-col items-center">
                        <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-2 text-white shadow-lg shadow-indigo-500/30">
                          <FiFlag className="h-full w-full" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full border-2 border-white bg-gray-300 shadow" />
                    )}
                    <div className="mt-1 max-w-[220px] text-center">
                      <div className="text-xs font-bold text-gray-900">{isGoal ? goalTitle || 'Goal' : 'Session starts'}</div>
                      <div className="text-[11px] text-gray-500">
                        {fmtDate(isGoal ? endDate : startDate)}
                        {isGoal && goalDays !== null && (
                          <span className={`ml-1 font-semibold ${goalDays < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                            · {goalDays < 0 ? `−${Math.abs(goalDays)}` : goalDays} days
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            }

            if (row.kind === 'here') {
              return (
                <li key="here" className="relative flex items-center justify-center py-1">
                  <div className="rm-here relative flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-white shadow-lg shadow-blue-500/30">
                    <span className="rm-here-ring" />
                    <span className="rm-here-ring" />
                    <FiMapPin className="relative h-4 w-4" />
                    <span className="relative text-[11px] font-bold">
                      You are here · {goalDays === null ? '—' : goalDays < 0 ? `−${Math.abs(goalDays)}` : goalDays} days to goal
                    </span>
                  </div>
                </li>
              );
            }

            const isStaff = row.kind === 'staff';
            const m = row.m as Milestone & SelfMilestone;
            const days = daysUntil(isStaff ? (row.m as Milestone).dueDate : (row.m as SelfMilestone).date);
            const Icon = isStaff ? iconFor((row.m as Milestone).icon) : ((row.m as SelfMilestone).type === 'ACHIEVEMENT' ? FiAward : FiStar);
            const answered = isStaff && !!(row.m as Milestone).myResponse;
            return (
              <li key={`${row.kind}-${m.id}`} className={`relative flex ${isStaff ? 'justify-start pr-[52%]' : 'justify-end pl-[52%]'}`}>
                <button
                  type="button"
                  onClick={() => (isStaff ? onMilestone?.(row.m as Milestone) : onSelf?.(row.m as SelfMilestone))}
                  className={`${mounted ? 'rm-pop' : 'opacity-0'} w-full rounded-2xl border p-2.5 text-left shadow-sm ${
                    isStaff
                      ? 'border-indigo-100 bg-indigo-50/70 hover:bg-indigo-50'
                      : 'border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50'
                  }`}
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <div className={`flex items-center gap-1.5 ${isStaff ? '' : 'flex-row-reverse'}`}>
                    <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-white ${isStaff ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-xs font-bold text-gray-900">{m.title}</span>
                  </div>
                  <div className={`mt-1 text-[10px] ${isStaff ? '' : 'text-right'} text-gray-500`}>
                    {fmtDate(isStaff ? (row.m as Milestone).dueDate : (row.m as SelfMilestone).date)}
                    {days !== null && (
                      <span className={`ml-1 font-semibold ${days < 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                        · {days < 0 ? `−${Math.abs(days)}` : days}d
                      </span>
                    )}
                  </div>
                  <div className={`mt-0.5 text-[10px] font-semibold ${isStaff ? 'text-indigo-700' : 'text-emerald-700'} ${isStaff ? '' : 'text-right'}`}>
                    {isStaff
                      ? (answered ? 'Answered' : (row.m as Milestone).questions.length ? 'Tap to answer' : 'From faculty')
                      : ((row.m as SelfMilestone).type === 'ACHIEVEMENT' ? 'My achievement' : 'My milestone')}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {studentLabel && <p className="mt-3 text-center text-[11px] text-gray-400">{studentLabel}</p>}
      </div>
    );
  }

  // ── Desktop: a true time axis ─────────────────────────────────
  const laneOffset = (lane: number) => 92 + lane * 74;

  return (
    <div className="relative" onMouseLeave={clearHover}>
      <div className="relative h-[460px] w-full overflow-hidden rounded-3xl">
        {/* staff milestones above */}
        {staff.map(({ m, at, lane }, i) => {
          const Icon = iconFor(m.icon);
          const days = daysUntil(m.dueDate);
          const answered = !!m.myResponse;
          return (
            <div
              key={m.id}
              className={`absolute flex -translate-x-1/2 flex-col items-center ${mounted ? 'rm-pop' : 'opacity-0'}`}
              style={{ left: `${at}%`, bottom: `calc(50% + ${laneOffset(lane)}px)`, animationDelay: `${160 + i * 60}ms` }}
            >
              <button
                type="button"
                onClick={() => onMilestone?.(m)}
                onMouseEnter={() => setHover({ label: m.title, days })}
                onFocus={() => setHover({ label: m.title, days })}
                className="rm-card w-[150px] rounded-2xl border border-indigo-100 bg-white/90 p-2.5 text-left shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-bold text-gray-900">{m.title}</span>
                </div>
                <div className="mt-1 text-[10px] text-gray-500">{fmtDate(m.dueDate)}</div>
                <div className="mt-0.5 text-[10px] font-semibold text-indigo-700">
                  {answered ? 'Answered' : m.questions.length ? `${m.questions.length} question${m.questions.length === 1 ? '' : 's'}` : 'From faculty'}
                </div>
              </button>
              {/* stem down to the rail */}
              <div className="w-px flex-1 bg-gradient-to-b from-indigo-300 to-indigo-200" style={{ height: laneOffset(lane) - 78 }} />
              <button
                type="button"
                aria-label={m.title}
                onClick={() => onMilestone?.(m)}
                onMouseEnter={() => setHover({ label: m.title, days })}
                className={`rm-pin flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg ${
                  answered ? 'bg-emerald-500' : 'bg-indigo-600'
                } text-white`}
              >
                <Icon className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {/* the rail */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
        <div
          className={`rm-progress absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full ${mounted ? 'rm-draw-x' : ''}`}
          style={{ width: `${currentPct}%` }}
        />
        <div ref={railRef} className="absolute left-0 right-0 top-1/2 h-0" />

        {/* session start */}
        <div className="absolute left-0 top-1/2 flex -translate-y-1/2 flex-col items-start">
          <div className="h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-gray-300 shadow" />
        </div>
        <div className="absolute left-0 top-1/2 mt-6 max-w-[160px] text-left">
          <div className="text-[11px] font-bold text-gray-700">Session starts</div>
          <div className="text-[11px] text-gray-400">{fmtDate(startDate)}</div>
        </div>

        {/* the goal, as a planted flag */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <div
            className={`rm-flag flex flex-col items-center ${mounted ? '' : 'opacity-0'}`}
            onMouseEnter={() => setHover({ label: goalTitle || 'Goal', days: goalDays })}
          >
            <div className="relative -translate-y-1/2">
              <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-500/30">
                <FiFlag className="rm-flag-cloth h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-1/2 mt-6 max-w-[190px] text-right">
          <div className="truncate text-[11px] font-bold text-gray-900">{goalTitle || 'Final goal'}</div>
          <div className="text-[11px] text-gray-400">{fmtDate(endDate)}</div>
        </div>

        {/* where the student is standing today */}
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${currentPct}%` }}
        >
          <div className="rm-here relative flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-white">
            <span className="rm-here-ring" />
            <span className="rm-here-ring" />
            <FiMapPin className="relative h-3.5 w-3.5" />
          </div>
        </div>
        {/* the days-left badge sits right above that marker */}
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2"
          style={{ left: `${currentPct}%`, top: 'calc(50% - 74px)' }}
        >
          <div className="flex flex-col items-center">
            <DaysBadge
              days={hover ? hover.days : goalDays}
              caption={hover ? hover.label : 'to your goal'}
            />
            <div className="h-5 w-px bg-blue-300" />
          </div>
        </div>

        {/* the student's own milestones below */}
        {own.map(({ m, at, lane }, i) => {
          const Icon = m.type === 'ACHIEVEMENT' ? FiAward : FiStar;
          const days = daysUntil(m.date);
          return (
            <div
              key={m.id}
              className={`absolute flex -translate-x-1/2 flex-col items-center ${mounted ? 'rm-pop' : 'opacity-0'}`}
              style={{ left: `${at}%`, top: `calc(50% + 18px)`, animationDelay: `${220 + i * 60}ms` }}
            >
              <button
                type="button"
                aria-label={m.title}
                onClick={() => onSelf?.(m)}
                onMouseEnter={() => setHover({ label: m.title, days })}
                className={`rm-pin flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${
                  m.type === 'ACHIEVEMENT' ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
              <div className="w-px bg-gradient-to-b from-emerald-200 to-emerald-300" style={{ height: laneOffset(lane) - 92 + 14 }} />
              <button
                type="button"
                onClick={() => onSelf?.(m)}
                onMouseEnter={() => setHover({ label: m.title, days })}
                className="rm-card w-[150px] rounded-2xl border border-emerald-100 bg-white/90 p-2.5 text-left shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-white ${m.type === 'ACHIEVEMENT' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-bold text-gray-900">{m.title}</span>
                </div>
                <div className="mt-1 text-[10px] text-gray-500">{fmtDate(m.date)}</div>
                <div className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold ${m.type === 'ACHIEVEMENT' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {m.type === 'ACHIEVEMENT' ? 'Achievement' : 'My milestone'}
                  {onSelf && <FiEdit2 className="h-2.5 w-2.5" />}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Faculty milestones (above)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> My milestones (below)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> My achievements</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Today</span>
        {studentLabel && <span className="text-gray-400">· {studentLabel}</span>}
      </div>
    </div>
  );
}
