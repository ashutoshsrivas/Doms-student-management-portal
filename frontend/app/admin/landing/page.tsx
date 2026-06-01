'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiSave,
  FiRefreshCw,
  FiPlus,
  FiTrash2,
  FiLoader,
  FiExternalLink,
  FiAlertTriangle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import useAuthStore from '@/app/store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/* ─── Types (mirror /api/landing payload) ────────────────────── */
type Cta = { label: string; href: string };
type Stat = { fig: string; cap: string };
type AboutCard = { k: string; h: string; p: string };
type Programme = { code: string; name: string; duration: string; note: string; specs?: string[] };
type Placement = { name: string; program: string; pkg: string; year: string; photo?: string };
type Facility = { name: string; img: string };

type Payload = {
  hero: {
    eyebrow: string; title1: string; title2: string; paragraph: string;
    primaryCta: Cta; secondaryCta: Cta; stats: Stat[];
  };
  about: { eyebrow: string; heading: string; cards: AboutCard[] };
  programmes: { eyebrow: string; heading: string; sub: string; items: Programme[] };
  placements: {
    eyebrow: string; heading: string; sub: string;
    featuredImage: string; featuredLabel: string; items: Placement[];
  };
  campus: { eyebrow: string; heading: string; sub: string; items: Facility[] };
  cta: { eyebrow: string; title1: string; title2: string; paragraph: string };
  contact: {
    eyebrow: string; heading: string; address: string;
    phones: string[]; emails: string[];
  };
};

type Tab = 'hero' | 'about' | 'programmes' | 'placements' | 'campus' | 'cta' | 'contact';
const TABS: { id: Tab; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'about', label: 'About' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'placements', label: 'Placements' },
  { id: 'campus', label: 'Campus' },
  { id: 'cta', label: 'CTA' },
  { id: 'contact', label: 'Contact' },
];

function LandingEditor() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuthStore();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  /* fetch */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/landing`, { cache: 'no-store' });
        const data = await r.json();
        setPayload(data.payload);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load landing content');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  /* warn on unload */
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const update = <K extends keyof Payload>(key: K, value: Payload[K]) => {
    setPayload((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!payload || !token) return;
    try {
      setSaving(true);
      const r = await fetch(`${API_BASE}/landing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payload }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || 'Save failed');
      toast.success('Landing page updated');
      setDirty(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!token) return;
    if (!confirm('Reset all landing-page content to the original defaults? This cannot be undone (your current content will be replaced).')) return;
    try {
      setResetting(true);
      const r = await fetch(`${API_BASE}/landing/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || 'Reset failed');
      setPayload(data.payload);
      setDirty(false);
      toast.success('Reset to defaults');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Reset failed';
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  if (loading || !payload) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-600">
        <FiLoader className="animate-spin mr-2" /> Loading editor…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Landing Page Editor</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Edit the public homepage at <span className="font-medium text-slate-700">/</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg"
            >
              <FiExternalLink size={14} /> Preview
            </a>
            <button
              onClick={resetToDefaults}
              disabled={resetting || saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50"
            >
              <FiRefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
              Reset to defaults
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-slate-900 hover:bg-black text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-5 lg:px-8">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dirty banner */}
      {dirty && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-5 lg:px-8 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <FiAlertTriangle size={14} /> You have unsaved changes.
          </div>
        </div>
      )}

      {/* Body */}
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-8 pb-24">
        {tab === 'hero'       && <HeroEditor       value={payload.hero}       onChange={(v) => update('hero', v)} />}
        {tab === 'about'      && <AboutEditor      value={payload.about}      onChange={(v) => update('about', v)} />}
        {tab === 'programmes' && <ProgrammesEditor value={payload.programmes} onChange={(v) => update('programmes', v)} />}
        {tab === 'placements' && <PlacementsEditor value={payload.placements} onChange={(v) => update('placements', v)} />}
        {tab === 'campus'     && <CampusEditor     value={payload.campus}     onChange={(v) => update('campus', v)} />}
        {tab === 'cta'        && <CtaEditor        value={payload.cta}        onChange={(v) => update('cta', v)} />}
        {tab === 'contact'    && <ContactEditor    value={payload.contact}    onChange={(v) => update('contact', v)} />}
      </div>
    </div>
  );
}

export default function LandingEditorPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD']}>
      <DashboardLayout>
        <LandingEditor />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

/* ───────────────────────── building blocks ───────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-slate-900';
const textareaCls = `${inputCls} resize-y min-h-[80px] leading-relaxed`;

function Card({
  title,
  right,
  children,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-5">
      {(title || right) && (
        <div className="flex items-center justify-between mb-5">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function RowActions({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="text-slate-400 hover:text-red-600 transition p-2"
      aria-label="Remove"
    >
      <FiTrash2 size={15} />
    </button>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-slate-700 border border-dashed border-slate-300 hover:border-slate-500 hover:text-slate-900 rounded-lg px-3 py-2"
    >
      <FiPlus size={14} /> {label}
    </button>
  );
}

/* ───────────────────────── HERO ───────────────────────── */

function HeroEditor({ value, onChange }: { value: Payload['hero']; onChange: (v: Payload['hero']) => void }) {
  const set = <K extends keyof Payload['hero']>(k: K, v: Payload['hero'][K]) =>
    onChange({ ...value, [k]: v });

  return (
    <>
      <Card title="Hero — headings & body">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Eyebrow" hint="Small uppercase text above the title">
            <input className={inputCls} value={value.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
          </Field>
          <div />
          <Field label="Title — line 1">
            <input className={inputCls} value={value.title1} onChange={(e) => set('title1', e.target.value)} />
          </Field>
          <Field label="Title — line 2" hint="Renders in accent color">
            <input className={inputCls} value={value.title2} onChange={(e) => set('title2', e.target.value)} />
          </Field>
          <Field label="Paragraph" hint="The intro paragraph beneath the title">
            <textarea className={textareaCls} value={value.paragraph} onChange={(e) => set('paragraph', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Hero — call-to-action buttons">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Primary button — label">
            <input className={inputCls} value={value.primaryCta.label}
              onChange={(e) => set('primaryCta', { ...value.primaryCta, label: e.target.value })} />
          </Field>
          <Field label="Primary button — link">
            <input className={inputCls} value={value.primaryCta.href}
              onChange={(e) => set('primaryCta', { ...value.primaryCta, href: e.target.value })} />
          </Field>
          <Field label="Secondary button — label">
            <input className={inputCls} value={value.secondaryCta.label}
              onChange={(e) => set('secondaryCta', { ...value.secondaryCta, label: e.target.value })} />
          </Field>
          <Field label="Secondary button — link">
            <input className={inputCls} value={value.secondaryCta.href}
              onChange={(e) => set('secondaryCta', { ...value.secondaryCta, href: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card
        title="Hero — stats strip"
        right={
          <AddBtn
            label="Add stat"
            onClick={() => set('stats', [...value.stats, { fig: '', cap: '' }])}
          />
        }
      >
        <div className="space-y-3">
          {value.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12 sm:col-span-4">
                <Field label="Figure"><input className={inputCls} value={s.fig}
                  onChange={(e) => {
                    const next = [...value.stats]; next[i] = { ...s, fig: e.target.value };
                    set('stats', next);
                  }} /></Field>
              </div>
              <div className="col-span-11 sm:col-span-7">
                <Field label="Caption"><input className={inputCls} value={s.cap}
                  onChange={(e) => {
                    const next = [...value.stats]; next[i] = { ...s, cap: e.target.value };
                    set('stats', next);
                  }} /></Field>
              </div>
              <div className="col-span-1">
                <RowActions onRemove={() => set('stats', value.stats.filter((_, idx) => idx !== i))} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── ABOUT ───────────────────────── */

function AboutEditor({ value, onChange }: { value: Payload['about']; onChange: (v: Payload['about']) => void }) {
  const set = <K extends keyof Payload['about']>(k: K, v: Payload['about'][K]) =>
    onChange({ ...value, [k]: v });

  return (
    <>
      <Card title="About — section headings">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Eyebrow"><input className={inputCls} value={value.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
          <div />
          <Field label="Heading"><textarea className={textareaCls} value={value.heading} onChange={(e) => set('heading', e.target.value)} /></Field>
        </div>
      </Card>

      <Card
        title="About — feature cards"
        right={
          <AddBtn
            label="Add card"
            onClick={() => set('cards', [...value.cards, { k: '', h: '', p: '' }])}
          />
        }
      >
        <div className="space-y-5">
          {value.cards.map((c, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 grid gap-3">
              <div className="grid sm:grid-cols-4 gap-3">
                <Field label="Index (e.g. 01)">
                  <input className={inputCls} value={c.k}
                    onChange={(e) => {
                      const next = [...value.cards]; next[i] = { ...c, k: e.target.value };
                      set('cards', next);
                    }} />
                </Field>
                <div className="sm:col-span-3">
                  <Field label="Heading">
                    <input className={inputCls} value={c.h}
                      onChange={(e) => {
                        const next = [...value.cards]; next[i] = { ...c, h: e.target.value };
                        set('cards', next);
                      }} />
                  </Field>
                </div>
              </div>
              <Field label="Paragraph">
                <textarea className={textareaCls} value={c.p}
                  onChange={(e) => {
                    const next = [...value.cards]; next[i] = { ...c, p: e.target.value };
                    set('cards', next);
                  }} />
              </Field>
              <div className="flex justify-end">
                <RowActions onRemove={() => set('cards', value.cards.filter((_, idx) => idx !== i))} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── PROGRAMMES ───────────────────────── */

function ProgrammesEditor({ value, onChange }: { value: Payload['programmes']; onChange: (v: Payload['programmes']) => void }) {
  const set = <K extends keyof Payload['programmes']>(k: K, v: Payload['programmes'][K]) =>
    onChange({ ...value, [k]: v });

  return (
    <>
      <Card title="Programmes — section headings">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Eyebrow"><input className={inputCls} value={value.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
          <Field label="Heading"><input className={inputCls} value={value.heading} onChange={(e) => set('heading', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Sub-paragraph"><textarea className={textareaCls} value={value.sub} onChange={(e) => set('sub', e.target.value)} /></Field>
          </div>
        </div>
      </Card>

      <Card
        title="Programmes — list"
        right={
          <AddBtn
            label="Add programme"
            onClick={() => set('items', [...value.items, { code: '', name: '', duration: '', note: '', specs: [] }])}
          />
        }
      >
        <div className="space-y-5">
          {value.items.map((p, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4">
              <div className="grid sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2">
                  <Field label="Code">
                    <input className={inputCls} value={p.code}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, code: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
                <div className="sm:col-span-7">
                  <Field label="Programme name">
                    <input className={inputCls} value={p.name}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, name: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label="Duration">
                    <input className={inputCls} value={p.duration}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, duration: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
              </div>
              <div className="mt-3">
                <Field label="Drawer note">
                  <textarea className={textareaCls} value={p.note}
                    onChange={(e) => {
                      const next = [...value.items]; next[i] = { ...p, note: e.target.value };
                      set('items', next);
                    }} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Specialisations" hint="One per line">
                  <textarea
                    className={textareaCls}
                    rows={Math.max(3, (p.specs?.length || 0) + 1)}
                    value={(p.specs || []).join('\n')}
                    onChange={(e) => {
                      const next = [...value.items];
                      next[i] = {
                        ...p,
                        specs: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      };
                      set('items', next);
                    }}
                  />
                </Field>
              </div>
              <div className="flex justify-end mt-3">
                <RowActions onRemove={() => set('items', value.items.filter((_, idx) => idx !== i))} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── PLACEMENTS ───────────────────────── */

function PlacementsEditor({ value, onChange }: { value: Payload['placements']; onChange: (v: Payload['placements']) => void }) {
  const set = <K extends keyof Payload['placements']>(k: K, v: Payload['placements'][K]) =>
    onChange({ ...value, [k]: v });

  return (
    <>
      <Card title="Placements — section headings">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Eyebrow"><input className={inputCls} value={value.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
          <Field label="Heading"><input className={inputCls} value={value.heading} onChange={(e) => set('heading', e.target.value)} /></Field>
          <Field label="Sub-line"><input className={inputCls} value={value.sub} onChange={(e) => set('sub', e.target.value)} /></Field>
          <Field label="Featured-frame label" hint="Shown by default in the photo">
            <input className={inputCls} value={value.featuredLabel} onChange={(e) => set('featuredLabel', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Featured image URL" hint="Shown when no card is hovered">
              <input className={inputCls} value={value.featuredImage} onChange={(e) => set('featuredImage', e.target.value)} />
            </Field>
            {value.featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.featuredImage} alt="" className="mt-3 rounded-lg max-h-40 object-cover border border-slate-200" />
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Placements — student cards"
        right={
          <AddBtn
            label="Add placement"
            onClick={() => set('items', [...value.items, { name: '', program: '', pkg: '', year: '', photo: '' }])}
          />
        }
      >
        <div className="space-y-5">
          {value.items.map((p, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 grid gap-3">
              <div className="grid sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <Field label="Name">
                    <input className={inputCls} value={p.name}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, name: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
                <div className="sm:col-span-4">
                  <Field label="Programme">
                    <input className={inputCls} value={p.program}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, program: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Package">
                    <input className={inputCls} value={p.pkg}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, pkg: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Year">
                    <input className={inputCls} value={p.year}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, year: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-2">
                  <Field label="Photo URL" hint="Shown when you hover this name on the landing page">
                    <input className={inputCls} value={p.photo || ''}
                      onChange={(e) => {
                        const next = [...value.items]; next[i] = { ...p, photo: e.target.value };
                        set('items', next);
                      }} />
                  </Field>
                </div>
                <div className="flex justify-end items-end h-full">
                  <RowActions onRemove={() => set('items', value.items.filter((_, idx) => idx !== i))} />
                </div>
              </div>
              {p.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo} alt="" className="rounded-lg max-h-32 object-cover border border-slate-200 w-auto" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── CAMPUS ───────────────────────── */

function CampusEditor({ value, onChange }: { value: Payload['campus']; onChange: (v: Payload['campus']) => void }) {
  const set = <K extends keyof Payload['campus']>(k: K, v: Payload['campus'][K]) =>
    onChange({ ...value, [k]: v });

  return (
    <>
      <Card title="Campus — section headings">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Eyebrow"><input className={inputCls} value={value.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
          <Field label="Heading"><input className={inputCls} value={value.heading} onChange={(e) => set('heading', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Sub-paragraph"><textarea className={textareaCls} value={value.sub} onChange={(e) => set('sub', e.target.value)} /></Field>
          </div>
        </div>
      </Card>

      <Card
        title="Campus — facility tiles"
        right={
          <AddBtn
            label="Add facility"
            onClick={() => set('items', [...value.items, { name: '', img: '' }])}
          />
        }
      >
        <div className="grid gap-4">
          {value.items.map((f, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 grid sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <Field label="Name">
                  <input className={inputCls} value={f.name}
                    onChange={(e) => {
                      const next = [...value.items]; next[i] = { ...f, name: e.target.value };
                      set('items', next);
                    }} />
                </Field>
              </div>
              <div className="sm:col-span-7">
                <Field label="Image URL">
                  <input className={inputCls} value={f.img}
                    onChange={(e) => {
                      const next = [...value.items]; next[i] = { ...f, img: e.target.value };
                      set('items', next);
                    }} />
                </Field>
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <RowActions onRemove={() => set('items', value.items.filter((_, idx) => idx !== i))} />
              </div>
              {f.img && (
                <div className="sm:col-span-12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.img} alt="" className="mt-1 rounded-lg max-h-28 object-cover border border-slate-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ───────────────────────── CTA ───────────────────────── */

function CtaEditor({ value, onChange }: { value: Payload['cta']; onChange: (v: Payload['cta']) => void }) {
  const set = <K extends keyof Payload['cta']>(k: K, v: Payload['cta'][K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Card title="Call-to-Action — dark band before the contact section">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Eyebrow"><input className={inputCls} value={value.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
        <div />
        <Field label="Title — line 1"><input className={inputCls} value={value.title1} onChange={(e) => set('title1', e.target.value)} /></Field>
        <Field label="Title — line 2"><input className={inputCls} value={value.title2} onChange={(e) => set('title2', e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <Field label="Paragraph"><textarea className={textareaCls} value={value.paragraph} onChange={(e) => set('paragraph', e.target.value)} /></Field>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────── CONTACT ───────────────────────── */

function ContactEditor({ value, onChange }: { value: Payload['contact']; onChange: (v: Payload['contact']) => void }) {
  const set = <K extends keyof Payload['contact']>(k: K, v: Payload['contact'][K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Card title="Contact">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Eyebrow"><input className={inputCls} value={value.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></Field>
        <Field label="Heading"><input className={inputCls} value={value.heading} onChange={(e) => set('heading', e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <Field label="Address"><textarea className={textareaCls} value={value.address} onChange={(e) => set('address', e.target.value)} /></Field>
        </div>
        <Field label="Helpline numbers" hint="One per line">
          <textarea className={textareaCls} value={value.phones.join('\n')}
            onChange={(e) => set('phones', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
        </Field>
        <Field label="Emails" hint="One per line">
          <textarea className={textareaCls} value={value.emails.join('\n')}
            onChange={(e) => set('emails', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
        </Field>
      </div>
    </Card>
  );
}
