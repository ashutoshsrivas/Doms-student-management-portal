'use client';

import { useMemo, useRef, useState } from 'react';
import { FiArrowRight, FiArrowLeft, FiCheck, FiClock, FiRotateCcw } from 'react-icons/fi';
import { Goal, Question, fmtDate, visibleQuestions } from './types';

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
  const targetDate = sessionEnd || goal?.targetDate || '';
  const [editing, setEditing] = useState(!goal);

  // Only the questions this student's own answers call for. Picking
  // "Startup" on the first question is what brings the startup questions
  // into existence; the list grows and shrinks as they change their mind.
  const asked = useMemo(() => visibleQuestions(questions, answers), [questions, answers]);
  const total = asked.length;
  // The list can shrink under the cursor, so never trust the raw index.
  const at = Math.min(step, Math.max(0, total - 1));
  const lastStep = at === total - 1;
  const current = asked[at];
  const answered = useMemo(
    () => asked.filter((q) => String(answers[q.id] || '').trim()).length,
    [asked, answers],
  );
  const progress = Math.round((answered / Math.max(1, total)) * 100);

  const canAdvance = !current?.required || !!String(answers[current.id] || '').trim();

  // The branch the student is on, named for the header chip.
  const branch = useMemo(() => {
    const parentIds = new Set(questions.map((q) => q.showIf?.questionId).filter(Boolean) as string[]);
    for (const q of asked) {
      if (parentIds.has(q.id) && String(answers[q.id] || '').trim()) return String(answers[q.id]);
    }
    return '';
  }, [questions, asked, answers]);

  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pick = (q: Question, value: string) => {
    // Answers to a branch they have stepped away from are kept here so
    // going back restores them; the server drops them when the goal is sent.
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    // Choosing is the whole of the answer, so move on by itself — briefly,
    // so the student sees which card they picked.
    if (advance.current) clearTimeout(advance.current);
    advance.current = setTimeout(() => setStep((s) => s + 1), 260);
  };

  const submit = () => {
    onSave({
      title: String(answers.goal || '').trim() || String(answers[asked[0]?.id] || '').trim(),
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
            <p className="mt-1 text-sm text-gray-500">By the end of the session · {fmtDate(sessionEnd || goal.targetDate)}</p>
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
                  {answered}/{total} answered
                </div>
              </div>
            </div>
          </div>
        </div>

        <div key={current?.id || at} className="rm-rise w-full rounded-3xl border border-gray-100 bg-white/85 p-5 shadow-sm sm:p-6">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                Step {Math.min(at + 1, total)} of {total}
              </span>
              {branch && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {branch}
                </span>
              )}
            </span>
            {current && !current.required && (
              <span className="text-[11px] text-gray-400">optional</span>
            )}
          </div>

          {current ? (
            <>
              <label className="block text-base font-bold text-gray-900 sm:text-lg">{current.label}</label>
              {current.type === 'choice' && (current.options || []).length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(current.options || []).map((o) => {
                    const picked = answers[current.id] === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => pick(current, o)}
                        className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          picked
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                      >
                        {o}
                        <span className={`grid h-5 w-5 flex-none place-items-center rounded-full border ${picked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'}`}>
                          {picked && <FiCheck className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : current.type === 'textarea' ? (
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
                  onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance && !lastStep) setStep(at + 1); }}
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none"
                />
              )}
            </>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, at - 1))}
              disabled={at === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <FiArrowLeft className="h-4 w-4" /> Back
            </button>

            {lastStep ? (
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
                onClick={() => setStep(Math.min(total - 1, at + 1))}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
              >
                Next <FiArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-gray-500">
            Your goal is for the <strong>end of your session</strong>{targetDate ? ` — ${fmtDate(targetDate)}` : ''}.
          </p>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === at ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200'}`}
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
