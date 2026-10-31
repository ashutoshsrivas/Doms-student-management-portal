'use client';

import { useMemo, useState } from 'react';
import { FiArrowRight, FiArrowLeft, FiCheck, FiClock, FiRotateCcw } from 'react-icons/fi';
import { Goal, Question, fmtDate } from './types';

type Props = {
  questions: Question[];
  goal: Goal | null;
  sessionEnd: string | null;
  saving: boolean;
  onSave: (payload: { title: string; answers: Record<string, string>; targetDate: string | null }) => void;
};

// The orb: one question at a time, floating in front of a glowing sphere.
// It keeps its own draft until the student sends it for approval.
export default function GoalOrb({ questions, goal, sessionEnd, saving, onSave }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(goal?.answers || {});
  const [targetDate, setTargetDate] = useState<string>(goal?.targetDate || sessionEnd || '');
  const [editing, setEditing] = useState(!goal);

  const total = questions.length + 1; // the questions, then the date
  const onDateStep = step === questions.length;
  const current = questions[step];
  const answered = useMemo(
    () => questions.filter((q) => String(answers[q.id] || '').trim()).length,
    [questions, answers],
  );
  const progress = Math.round(((onDateStep ? total : step) / total) * 100);

  const canAdvance = onDateStep
    ? !!targetDate
    : !current?.required || !!String(answers[current.id] || '').trim();

  const submit = () => {
    onSave({
      title: String(answers.goal || '').trim() || String(answers[questions[0]?.id] || '').trim(),
      answers,
      targetDate: targetDate || null,
    });
  };

  // ── Waiting / rejected states keep the orb, with its own mood ──
  if (goal && !editing) {
    const waiting = goal.status === 'PENDING';
    return (
      <div className="rm-stage rounded-3xl border border-white/60 p-6 sm:p-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 sm:gap-8">
          <div className="rm-orb-wrap">
            <div className="rm-orb h-40 w-40 sm:h-52 sm:w-52">
              <span className="rm-orb-glass" />
              {waiting && (<><span className="rm-orb-pulse" /><span className="rm-orb-pulse" /><span className="rm-orb-pulse" /></>)}
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  {waiting ? 'Awaiting approval' : 'Sent back'}
                </span>
              </div>
            </div>
          </div>

          <div className="rm-rise w-full rounded-3xl border border-gray-100 bg-white/80 p-5 text-center shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">{goal.title}</h2>
            <p className="mt-1 text-sm text-gray-500">Target · {fmtDate(goal.targetDate)}</p>
            {waiting ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                <FiClock className="h-3.5 w-3.5" /> A faculty member will review this. Your timeline appears once it is approved.
              </p>
            ) : (
              <div className="mt-3">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  Sent back for a rethink
                </p>
                {goal.decisionNote && <p className="mt-2 text-sm text-gray-600">“{goal.decisionNote}”</p>}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setEditing(true); setStep(0); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiRotateCcw className="h-4 w-4" /> Edit my answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rm-stage rounded-3xl border border-white/60 p-6 sm:p-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-7 sm:gap-9">
        <div className="rm-orb-wrap">
          <div className="rm-orb h-44 w-44 sm:h-56 sm:w-56">
            <span className="rm-orb-glass" />
            <span className="rm-orb-pulse" />
            <span className="rm-orb-pulse" />
            <span className="rm-orb-pulse" />
            <div className="absolute inset-0 grid place-items-center p-7 text-center">
              <div>
                <div className="text-3xl font-bold tabular-nums text-white drop-shadow sm:text-4xl">{progress}%</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
                  {answered}/{questions.length} answered
                </div>
              </div>
            </div>
          </div>
        </div>

        <div key={step} className="rm-rise w-full rounded-3xl border border-gray-100 bg-white/85 p-5 shadow-sm sm:p-6">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              Step {Math.min(step + 1, total)} of {total}
            </span>
            {!onDateStep && current && !current.required && (
              <span className="text-[11px] text-gray-400">optional</span>
            )}
          </div>

          {onDateStep ? (
            <>
              <label className="block text-base font-bold text-gray-900 sm:text-lg">By when do you want to reach it?</label>
              <p className="mt-1 text-xs text-gray-500">Your timeline runs from the start of your session to this date.</p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none"
              />
            </>
          ) : current ? (
            <>
              <label className="block text-base font-bold text-gray-900 sm:text-lg">{current.label}</label>
              {current.type === 'textarea' ? (
                <textarea
                  rows={4}
                  autoFocus
                  value={answers[current.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
                  maxLength={2000}
                  placeholder="Take your time…"
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none"
                />
              ) : (
                <input
                  autoFocus
                  value={answers[current.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
                  maxLength={500}
                  placeholder="Type your answer…"
                  onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance) setStep((s) => Math.min(total - 1, s + 1)); }}
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none"
                />
              )}
            </>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <FiArrowLeft className="h-4 w-4" /> Back
            </button>

            {onDateStep ? (
              <button
                type="button"
                onClick={submit}
                disabled={saving || !canAdvance}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 disabled:opacity-50"
              >
                <FiCheck className="h-4 w-4" /> {saving ? 'Saving…' : 'Set my goal'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
              >
                Next <FiArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {goal && (
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
