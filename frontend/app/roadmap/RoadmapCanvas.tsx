'use client';

import { ReactNode, useEffect } from 'react';
import { FiX, FiFlag, FiPlus, FiCalendar } from 'react-icons/fi';
import Timeline from './Timeline';
import { Milestone, SelfMilestone, daysUntil, fmtDate } from './types';

type Props = {
  goalTitle: string;
  startDate: string | null;
  endDate: string | null;
  sessionName?: string;
  milestones: Milestone[];
  selfMilestones: SelfMilestone[];
  onMilestone?: (m: Milestone) => void;
  onSelf?: (m: SelfMilestone) => void;
  onAddSelf?: () => void;
  readOnlyLabel?: string;
  footer?: ReactNode;
  onClose: () => void;
};

// The roadmap gets the whole screen: the page only carries a slim preview,
// so the timeline itself has room to breathe.
export default function RoadmapCanvas({
  goalTitle, startDate, endDate, sessionName, milestones, selfMilestones,
  onMilestone, onSelf, onAddSelf, readOnlyLabel, footer, onClose,
}: Props) {
  // Escape closes it, and the page behind must not scroll underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const days = daysUntil(endDate);

  return (
    <div className="rm-fade fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="rm-stage flex min-h-0 flex-1 flex-col">
        {/* header */}
        <header className="flex flex-none items-start gap-3 border-b border-white/60 px-4 py-3 sm:px-6 sm:py-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25">
            <FiFlag className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">{goalTitle || 'My roadmap'}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500 sm:text-xs">
              <span className="inline-flex items-center gap-1">
                <FiCalendar className="h-3 w-3" />
                {fmtDate(startDate)} → {fmtDate(endDate)}
              </span>
              {sessionName && <span>{sessionName}</span>}
              {days !== null && (
                <span className={`font-semibold ${days < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                  {days < 0 ? `${Math.abs(days)} days past the session end` : `${days} days to the end of the session`}
                </span>
              )}
              {readOnlyLabel && <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">{readOnlyLabel}</span>}
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            {onAddSelf && (
              <button
                type="button"
                onClick={onAddSelf}
                className="hidden items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 sm:inline-flex"
              >
                <FiPlus className="h-4 w-4" /> Add my milestone
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the roadmap"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition hover:bg-white hover:text-gray-900"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* the canvas */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[1400px]">
            <Timeline
              startDate={startDate}
              endDate={endDate}
              goalTitle={goalTitle}
              milestones={milestones}
              selfMilestones={selfMilestones}
              onMilestone={onMilestone}
              onSelf={onSelf}
              studentLabel={readOnlyLabel}
              tall
            />
          </div>
          {footer && <div className="mx-auto mt-4 max-w-[1400px]">{footer}</div>}
        </div>

        {onAddSelf && (
          <div className="flex-none border-t border-white/60 px-4 py-3 sm:hidden">
            <button
              type="button"
              onClick={onAddSelf}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <FiPlus className="h-4 w-4" /> Add my milestone
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
