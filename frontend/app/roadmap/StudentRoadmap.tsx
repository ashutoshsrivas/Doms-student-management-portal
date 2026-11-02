'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiX, FiTrash2, FiAward, FiStar, FiFlag, FiCheck, FiMaximize2, FiClock, FiAlertCircle } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import GoalOrb from './GoalOrb';
import Timeline from './Timeline';
import RoadmapCanvas from './RoadmapCanvas';
import Portal from './Portal';
import { GoalNotice, Milestone, Roadmap, SelfMilestone, daysUntil, fmtDate } from './types';

export default function StudentRoadmap() {
  const [data, setData] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const [openMilestone, setOpenMilestone] = useState<Milestone | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [openSelf, setOpenSelf] = useState<Partial<SelfMilestone> | null>(null);
  const [canvas, setCanvas] = useState(false);
  const [notice, setNotice] = useState<GoalNotice | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: body } = await apiClient.get('/roadmap/me');
      setData(body);
      setNotice(body.notice || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load your roadmap');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveGoal = async (payload: { title: string; answers: Record<string, string>; targetDate: string | null }) => {
    try {
      setSaving(true);
      const { data: body } = await apiClient.post('/roadmap/goal', payload);
      toast.success(body.message || 'Goal saved');
      setData(body);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save your goal');
    } finally {
      setSaving(false);
    }
  };

  const saveAnswers = async () => {
    if (!openMilestone) return;
    try {
      setSaving(true);
      await apiClient.post(`/roadmap/milestones/${openMilestone.id}/response`, { answers });
      toast.success('Saved');
      setOpenMilestone(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save your answers');
    } finally {
      setSaving(false);
    }
  };

  const saveSelf = async () => {
    if (!openSelf) return;
    if (!openSelf.title?.trim()) { toast.error('Give it a title'); return; }
    if (!openSelf.date) { toast.error('Pick a date'); return; }
    try {
      setSaving(true);
      const payload = {
        title: openSelf.title.trim(),
        description: openSelf.description || null,
        date: openSelf.date,
        type: openSelf.type || 'MILESTONE',
      };
      if (openSelf.id) await apiClient.patch(`/roadmap/self-milestones/${openSelf.id}`, payload);
      else await apiClient.post('/roadmap/self-milestones', payload);
      toast.success(openSelf.id ? 'Updated' : 'Added to your timeline');
      setOpenSelf(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const removeSelf = async (m: SelfMilestone) => {
    if (!confirm(`Remove "${m.title}" from your timeline?`)) return;
    try {
      await apiClient.delete(`/roadmap/self-milestones/${m.id}`);
      toast.success('Removed');
      setOpenSelf(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to remove');
    }
  };

  // The flag is planted the first time an approved goal is seen.
  useEffect(() => {
    if (data?.goal?.status === 'APPROVED') {
      setJustApproved(true);
      const t = setTimeout(() => setJustApproved(false), 1200);
      return () => clearTimeout(t);
    }
  }, [data?.goal?.status]);

  if (loading) {
    return <div className="rounded-3xl border border-gray-200 bg-white px-4 py-16 text-center text-sm text-gray-500">Loading your roadmap…</div>;
  }
  if (!data) return null;

  const approved = data.goal?.status === 'APPROVED';
  // The goal is reached at the end of the session, so that is what the
  // countdown measures.
  const goalDate = data.session?.endDate || data.goal?.targetDate || null;
  const timelineStart = data.session?.startDate || data.goal?.createdAt?.slice(0, 10) || null;
  const daysLeft = daysUntil(goalDate);
  const pendingAnswers = data.milestones.filter((m) => m.questions.length > 0 && !m.myResponse).length;

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Roadmap</h1>
          <p className="mt-1 text-sm text-gray-500">
            {approved
              ? 'Your journey from the start of your session to the goal you set.'
              : 'Set one goal for your programme. Once a faculty member approves it, your timeline appears.'}
          </p>
        </div>
        {data.session && (
          <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-right">
            <div className="text-xs font-bold text-gray-900">{data.session.name}</div>
            <div className="text-[11px] text-gray-500">
              {fmtDate(data.session.startDate)} → {fmtDate(data.session.endDate)}
              {data.session.sectionName ? ` · ${data.session.sectionName}` : ''}
            </div>
          </div>
        )}
      </div>

      {!data.session && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You are not in an academic session yet, so your timeline has no start date. Your goal can still be set.
        </div>
      )}

      {!approved ? (
        <GoalOrb
          key={`${data.goal?.status || 'new'}-${data.goal?.id || 'none'}`}
          questions={data.questions}
          goal={data.goal}
          sessionEnd={data.session?.endDate || null}
          saving={saving}
          onSave={saveGoal}
        />
      ) : (
        <>
          <div className={`rm-stage overflow-hidden rounded-3xl border border-white/60 ${justApproved ? 'rm-fade' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25">
                  <FiFlag className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-gray-900">{data.goal?.title}</div>
                  <div className="text-[11px] text-gray-500">
                    By the end of the session · {fmtDate(goalDate)}
                    {data.goal?.approvedByName ? ` · approved by ${data.goal.approvedByName}` : ''}
                  </div>
                </div>
              </div>
              <div className={`flex-none rounded-2xl px-4 py-2 text-center ring-1 ${
                daysLeft === null ? 'bg-gray-100 text-gray-600 ring-gray-200'
                  : daysLeft < 0 ? 'bg-rose-50 text-rose-700 ring-rose-200'
                    : daysLeft <= 30 ? 'bg-amber-50 text-amber-800 ring-amber-200'
                      : 'bg-blue-50 text-blue-700 ring-blue-200'
              }`}>
                <div className="text-xl font-bold leading-none tabular-nums">
                  {daysLeft === null ? '—' : daysLeft < 0 ? `−${Math.abs(daysLeft)}` : daysLeft}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">days left</div>
              </div>
            </div>

            <Timeline
              variant="preview"
              startDate={timelineStart}
              endDate={goalDate}
              goalTitle={data.goal?.title || ''}
              milestones={data.milestones}
              selfMilestones={data.selfMilestones}
              onOpen={() => setCanvas(true)}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/60 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> {data.milestones.length} from faculty</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> {data.selfMilestones.length} mine</span>
                {pendingAnswers > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                    <FiClock className="h-3 w-3" /> {pendingAnswers} to answer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenSelf({ type: 'MILESTONE', date: new Date().toISOString().slice(0, 10) })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <FiPlus className="h-4 w-4" /> Add mine
                </button>
                <button
                  type="button"
                  onClick={() => setCanvas(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  <FiMaximize2 className="h-4 w-4" /> Open roadmap
                </button>
              </div>
            </div>
          </div>

          {/* A plain list under the timeline — easier to scan, and the only
              view that works well on a very small screen. */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-bold text-gray-900">From faculty</h2>
              {data.milestones.length === 0 ? (
                <p className="mt-2 text-xs italic text-gray-400">No faculty milestones in your session yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100">
                  {data.milestones.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{m.title}</div>
                        <div className="text-[11px] text-gray-500">{fmtDate(m.dueDate)}{m.createdByName ? ` · ${m.createdByName}` : ''}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setOpenMilestone(m); setAnswers(m.myResponse?.answers || {}); }}
                        className={`flex-none rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                          m.myResponse ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {m.myResponse ? 'Answered · edit' : m.questions.length ? 'Answer' : 'Open'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">Mine</h2>
                <button type="button" onClick={() => setOpenSelf({ type: 'MILESTONE', date: new Date().toISOString().slice(0, 10) })}
                  className="text-[11px] font-semibold text-blue-700 hover:underline">Add</button>
              </div>
              {data.selfMilestones.length === 0 ? (
                <p className="mt-2 text-xs italic text-gray-400">Nothing yet. Add a milestone you are working towards, or an achievement you already have.</p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100">
                  {data.selfMilestones.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {m.type === 'ACHIEVEMENT'
                            ? <FiAward className="h-3.5 w-3.5 flex-none text-amber-500" />
                            : <FiStar className="h-3.5 w-3.5 flex-none text-emerald-600" />}
                          <span className="truncate text-sm font-semibold text-gray-900">{m.title}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">{fmtDate(m.date)}</div>
                      </div>
                      <button type="button" onClick={() => setOpenSelf(m)}
                        className="flex-none rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">
                        Edit
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {notice && (
        <Portal>
          <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/50 p-4">
            <div className="rm-rise w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <FiAlertCircle className="h-6 w-6" />
              </span>
              <h3 className="mt-3 text-lg font-bold text-gray-900">Your goal was removed</h3>
              <p className="mt-2 text-sm text-gray-600">
                {notice.removedByName ? `${notice.removedByName} removed` : 'A faculty member removed'} your earlier goal
                {notice.title ? ' — ' : ''}
                {notice.title && <span className="font-semibold text-gray-800">“{notice.title}”</span>}
                {notice.removedAt ? ` on ${fmtDate(notice.removedAt)}` : ''}.
              </p>
              {notice.reason && <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">“{notice.reason}”</p>}
              <p className="mt-3 text-sm text-gray-500">Set a new goal to start your roadmap again.</p>
              <button
                type="button"
                onClick={async () => {
                  try { await apiClient.post(`/roadmap/notices/${notice.id}/ack`); } catch { /* the note is only informational */ }
                  setNotice(null);
                  await load();
                }}
                className="mt-5 w-full rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110"
              >
                Set a new goal
              </button>
            </div>
          </div>
        </Portal>
      )}

      {canvas && approved && (
        <RoadmapCanvas
          goalTitle={data.goal?.title || ''}
          startDate={timelineStart}
          endDate={goalDate}
          sessionName={data.session?.name}
          milestones={data.milestones}
          selfMilestones={data.selfMilestones}
          onMilestone={(m) => { setOpenMilestone(m); setAnswers(m.myResponse?.answers || {}); }}
          onSelf={(m) => setOpenSelf(m)}
          onAddSelf={() => setOpenSelf({ type: 'MILESTONE', date: new Date().toISOString().slice(0, 10) })}
          onClose={() => setCanvas(false)}
        />
      )}

      {/* Answer a faculty milestone */}
      {openMilestone && (
        <Portal>
        <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="rm-rise max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b bg-white px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{openMilestone.title}</h3>
                <p className="text-xs text-gray-500">
                  {fmtDate(openMilestone.dueDate)}
                  {openMilestone.createdByName ? ` · set by ${openMilestone.createdByName}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setOpenMilestone(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-5 py-4">
              {openMilestone.description && <p className="whitespace-pre-line text-sm text-gray-600">{openMilestone.description}</p>}
              {openMilestone.questions.length === 0 ? (
                <p className="text-sm italic text-gray-400">Nothing to fill in for this one.</p>
              ) : openMilestone.questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-semibold text-gray-800">
                    {q.label}{q.required && <span className="text-rose-500"> *</span>}
                  </label>
                  {q.type === 'choice' && (q.options || []).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(q.options || []).map((o) => (
                        <button key={o} type="button" onClick={() => setAnswers({ ...answers, [q.id]: o })}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            answers[q.id] === o ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  ) : q.type === 'text' ? (
                    <input value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" maxLength={500} />
                  ) : (
                    <textarea rows={3} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" maxLength={4000} />
                  )}
                </div>
              ))}
              {openMilestone.myResponse && (
                <p className="text-[11px] text-gray-400">Last saved {fmtDate(openMilestone.myResponse.submittedAt)}</p>
              )}
            </div>
            {openMilestone.questions.length > 0 && (
              <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-5 py-4">
                <button type="button" onClick={() => setOpenMilestone(null)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
                <button type="button" onClick={saveAnswers} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  <FiCheck className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
        </Portal>
      )}

      {/* Add or edit one of my own */}
      {openSelf && (
        <Portal>
        <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="rm-rise w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">{openSelf.id ? 'Edit' : 'Add to my timeline'}</h3>
              <button type="button" onClick={() => setOpenSelf(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-2 gap-2">
                {(['MILESTONE', 'ACHIEVEMENT'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setOpenSelf({ ...openSelf, type: t })}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                      (openSelf.type || 'MILESTONE') === t
                        ? t === 'ACHIEVEMENT' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {t === 'ACHIEVEMENT' ? <FiAward className="h-4 w-4" /> : <FiStar className="h-4 w-4" />}
                    {t === 'ACHIEVEMENT' ? 'Achievement' : 'Milestone'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Goal / title *</label>
                <input value={openSelf.title || ''} onChange={(e) => setOpenSelf({ ...openSelf, title: e.target.value })}
                  placeholder="e.g. Clear the AWS certification" maxLength={300}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Short description</label>
                <textarea rows={3} value={openSelf.description || ''} onChange={(e) => setOpenSelf({ ...openSelf, description: e.target.value })}
                  maxLength={2000} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                <input type="date" value={openSelf.date || ''} onChange={(e) => setOpenSelf({ ...openSelf, date: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
              </div>
              <p className="text-[11px] text-gray-400">Faculty can see this on your roadmap. Other students cannot.</p>
            </div>
            <div className="flex items-center justify-between border-t px-5 py-4">
              {openSelf.id ? (
                <button type="button" onClick={() => removeSelf(openSelf as SelfMilestone)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <FiTrash2 className="h-4 w-4" /> Remove
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpenSelf(null)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={saveSelf} disabled={saving}
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
                  {saving ? 'Saving…' : openSelf.id ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
