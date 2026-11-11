'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FiCheckCircle, FiLoader, FiLock, FiMapPin, FiSmartphone, FiShield,
  FiAlertCircle, FiArrowRight, FiSlash, FiUploadCloud, FiFile, FiX,
  FiRefreshCw,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import { RichView } from '@/app/components/RichText';
import {
  AnswerValue, FileAnswer, FormField, Media, Theme,
  FILE_ACCEPT_ATTR, fmtBytes, isChoice, isFileAnswer, normalizeOptions, themeOf,
} from '@/app/lib/forms';
import { collectDeviceSignals, requestLocation, DeviceSignals, LocationResult } from '../device';

type Autofill = { name: string; email: string; registrationNumber: string; session: string };

type Loaded = {
  form: {
    id: string;
    slug: string;
    title: string;
    description: string;
    audience: 'PUBLIC' | 'PRIVATE';
    fields: FormField[];
    collectLocation: boolean;
    collectDevice: boolean;
    locationRequired: boolean;
    closesAt: string | null;
    headerImageUrl: string | null;
    theme: string;
  };
  open: boolean;
  reason: string | null;
  autofill: Autofill | null;
  alreadyAnswered: string | null;
  entryPass: string | null;
};

// Module scope — a component created during render remounts its whole subtree
// on every pass, which steals the caret out of whatever is being typed into.
const Shell = ({ children, theme, headerImageUrl }: {
  children: React.ReactNode; theme: Theme; headerImageUrl?: string | null;
}) => (
  <div className={`min-h-screen w-full min-w-0 px-4 py-8 sm:py-14 ${theme.page}`}>
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <div className="mb-6 flex flex-col items-center text-center">
        {headerImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={headerImageUrl} alt="" className="max-h-44 w-full rounded-2xl object-cover shadow-sm" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="https://geu.ac.in/frontend/assets/images/geu-logo.webp" alt="Graphic Era University" className={`h-9 w-auto object-contain ${theme.dark ? 'brightness-0 invert' : ''}`} />
        )}
      </div>
      {children}
      <p className={`mt-6 text-center text-[11px] ${theme.muted}`}>Graphic Era School of Management</p>
    </div>
  </div>
);

// A picture or clip attached to a question or an option.
const MediaView = ({ media, small }: { media: Media; small?: boolean }) => (
  <div className={`overflow-hidden rounded-xl ${small ? 'max-w-[160px]' : 'max-w-md'}`}>
    {media.kind === 'video' ? (
      <video src={media.url} controls playsInline className="w-full" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media.url} alt="" className="w-full object-contain" loading="lazy" />
    )}
  </div>
);

export default function FillFormPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Loaded | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qrExpired, setQrExpired] = useState<{ title?: string; message: string } | null>(null);

  // The token the QR code carried, and the longer-lived pass the server hands
  // back once it has accepted one — so a code rotating mid-answer does not
  // throw the responder out.
  const qrToken = useRef<string | null>(null);
  const [entryPass, setEntryPass] = useState<string | null>(null);

  // The consent gate. It is shown every time the page opens — the browser may
  // remember its own permission, but our ask does not persist.
  const [consentDone, setConsentDone] = useState(false);
  const [asking, setAsking] = useState(false);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [device, setDevice] = useState<DeviceSignals | null>(null);
  const [deviceDeclined, setDeviceDeclined] = useState(false);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [typed, setTyped] = useState({ name: '', email: '', registrationNumber: '', session: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setQrExpired(null);
      // Read once, on the client: useSearchParams would force a Suspense
      // boundary around this whole page at build time.
      const search = new URLSearchParams(window.location.search);
      qrToken.current = search.get('k');
      const query: Record<string, string> = {};
      if (qrToken.current) query.k = qrToken.current;
      const res = await apiClient.get(`/f/${encodeURIComponent(slug)}`, { params: query });
      setData(res.data);
      setEntryPass(res.data.entryPass || null);
      setLoginRequired(false);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { loginRequired?: boolean; qrExpired?: boolean; message?: string; title?: string } } };
      if (err.response?.data?.qrExpired) {
        setQrExpired({
          title: err.response.data.title,
          message: err.response.data.message || 'This QR code has expired.',
        });
      } else if (err.response?.data?.loginRequired) setLoginRequired(true);
      else setLoadError(err.response?.data?.message || 'This form could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { if (slug) load(); }, [slug, load]);

  const form = data?.form;
  const theme = useMemo(() => themeOf(form?.theme), [form?.theme]);
  const needsConsent = !!(form && (form.collectLocation || form.collectDevice));

  // Nothing to ask for: go straight to the questions.
  useEffect(() => {
    if (form && !needsConsent) setConsentDone(true);
  }, [form, needsConsent]);

  const allow = async () => {
    if (!form) return;
    setAsking(true);
    try {
      if (form.collectDevice) setDevice(collectDeviceSignals());
      if (form.collectLocation) setLocation(await requestLocation());
    } finally {
      setAsking(false);
      setConsentDone(true);
    }
  };

  const decline = () => {
    setDeviceDeclined(true);
    setLocation({ status: 'DENIED' });
    setConsentDone(true);
  };

  const setAnswer = (id: string, value: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const clearAnswer = (id: string) =>
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const toggleMulti = (id: string, option: string) =>
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return { ...prev, [id]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option] };
    });

  // A file question uploads as soon as a file is chosen, so the submission
  // itself stays a small JSON request.
  const uploadAnswerFile = async (field: FormField, file: File | undefined) => {
    if (!file) return;
    const limit = (field.maxSizeMb || 10) * 1024 * 1024;
    if (file.size > limit) {
      setSubmitError(`“${field.label}”: keep the file under ${field.maxSizeMb || 10} MB.`);
      return;
    }
    try {
      setUploadingField(field.id);
      setSubmitError(null);
      const body = new FormData();
      body.append('file', file);
      body.append('fieldId', field.id);
      if (qrToken.current) body.append('qrToken', qrToken.current);
      if (entryPass) body.append('entryPass', entryPass);
      const res = await apiClient.post(`/f/${encodeURIComponent(slug)}/upload`, body);
      setAnswer(field.id, res.data.file as FileAnswer);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; loginRequired?: boolean; qrExpired?: boolean } } };
      if (err.response?.data?.loginRequired) setLoginRequired(true);
      else setSubmitError(err.response?.data?.message || 'That file could not be uploaded.');
    } finally {
      setUploadingField(null);
    }
  };

  const blockedByLocation = !!(form?.collectLocation && form.locationRequired && location?.status !== 'GRANTED');

  const submit = async () => {
    if (!form) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post(`/f/${encodeURIComponent(slug)}`, {
        answers,
        respondent: form.audience === 'PUBLIC' ? typed : undefined,
        qrToken: qrToken.current || undefined,
        entryPass: entryPass || undefined,
        location: form.collectLocation
          ? (location?.status === 'GRANTED'
            ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, status: 'GRANTED' }
            : { status: location?.status || 'DENIED' })
          : undefined,
        device: form.collectDevice
          ? (device && !deviceDeclined ? { ...device, status: 'GRANTED' } : { status: 'DENIED' })
          : undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; loginRequired?: boolean; qrExpired?: boolean } } };
      if (err.response?.data?.loginRequired) setLoginRequired(true);
      else if (err.response?.data?.qrExpired) {
        setQrExpired({ title: form.title, message: err.response.data.message || 'This QR code has expired.' });
      } else setSubmitError(err.response?.data?.message || 'Your response could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref = useMemo(() => {
    const back = typeof window === 'undefined'
      ? `/f/${slug}`
      : `/f/${slug}${window.location.search || ''}`;
    return `/auth/login?next=${encodeURIComponent(back)}`;
  }, [slug]);

  const card = `rounded-2xl border shadow-sm ${theme.card}`;

  if (loading) {
    return (
      <Shell theme={theme}>
        <div className={`${card} flex items-center justify-center gap-3 px-6 py-16 ${theme.muted}`}>
          <FiLoader className="h-5 w-5 animate-spin" /> Loading the form…
        </div>
      </Shell>
    );
  }

  if (qrExpired) {
    return (
      <Shell theme={theme}>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiRefreshCw className="h-6 w-6" />
          </span>
          <h1 className={`mt-4 text-lg font-bold ${theme.heading}`}>{qrExpired.title || 'Scan the code again'}</h1>
          <p className={`mt-2 text-sm ${theme.body}`}>{qrExpired.message}</p>
          <p className={`mt-3 text-xs ${theme.muted}`}>
            The code on screen changes every few seconds. Point your camera at the one showing now.
          </p>
        </div>
      </Shell>
    );
  }

  if (loginRequired) {
    return (
      <Shell theme={theme}>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FiLock className="h-6 w-6" />
          </span>
          <h1 className={`mt-4 text-lg font-bold ${theme.heading}`}>Sign in to continue</h1>
          <p className={`mt-2 text-sm ${theme.body}`}>This form is open to portal accounts only. Your name and session will be filled in for you.</p>
          <a
            href={loginHref}
            className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${theme.button}`}
          >
            Sign in <FiArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Shell>
    );
  }

  if (loadError || !form) {
    return (
      <Shell theme={theme}>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <FiAlertCircle className="h-6 w-6" />
          </span>
          <h1 className={`mt-4 text-lg font-bold ${theme.heading}`}>Form unavailable</h1>
          <p className={`mt-2 text-sm ${theme.body}`}>{loadError || 'This form could not be loaded.'}</p>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell theme={theme} headerImageUrl={form.headerImageUrl}>
        <div className={`${card} px-6 py-12 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-7 w-7" />
          </span>
          <h1 className={`mt-4 text-xl font-bold ${theme.heading}`}>Response recorded</h1>
          <p className={`mt-2 text-sm ${theme.body}`}>Thank you. Your answers to “{form.title}” have been saved.</p>
        </div>
      </Shell>
    );
  }

  if (!data?.open) {
    return (
      <Shell theme={theme} headerImageUrl={form.headerImageUrl}>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <FiSlash className="h-6 w-6" />
          </span>
          <h1 className={`mt-4 text-lg font-bold ${theme.heading}`}>{form.title}</h1>
          <p className={`mt-2 text-sm ${theme.body}`}>{data?.reason || 'This form is not accepting responses.'}</p>
        </div>
      </Shell>
    );
  }

  if (data.alreadyAnswered) {
    return (
      <Shell theme={theme} headerImageUrl={form.headerImageUrl}>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-6 w-6" />
          </span>
          <h1 className={`mt-4 text-lg font-bold ${theme.heading}`}>You have already answered</h1>
          <p className={`mt-2 text-sm ${theme.body}`}>This form takes one response per person, and yours is already in.</p>
        </div>
      </Shell>
    );
  }

  // ---- the consent gate ---------------------------------------------------

  if (!consentDone) {
    return (
      <Shell theme={theme} headerImageUrl={form.headerImageUrl}>
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-gray-100 bg-gradient-to-br from-indigo-50 to-fuchsia-50 px-6 py-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
              <FiShield className="h-5 w-5" />
            </span>
            <h1 className="mt-3 text-lg font-bold text-gray-900">Before you start</h1>
            <p className="mt-1 text-sm text-gray-600">“{form.title}” records the following with your response.</p>
          </div>
          <div className="space-y-4 px-6 py-5">
            {form.collectLocation && (
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FiMapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${theme.heading}`}>Your location</p>
                  <p className={`text-xs ${theme.body}`}>
                    Your browser will ask next. {form.locationRequired
                      ? 'This form cannot be submitted without it.'
                      : 'If you refuse, your response is still accepted and marked as “location refused”.'}
                  </p>
                </div>
              </div>
            )}
            {form.collectDevice && (
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <FiSmartphone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${theme.heading}`}>Your device</p>
                  <p className={`text-xs ${theme.body}`}>
                    Browser, operating system, screen size and time zone, combined into an anonymous
                    device code so the same device can be recognised if it answers twice. No MAC
                    address, no contacts, no files.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row-reverse">
            <button
              type="button"
              onClick={allow}
              disabled={asking}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${theme.button}`}
            >
              {asking ? <><FiLoader className="h-4 w-4 animate-spin" /> Asking your browser…</> : 'Allow and continue'}
            </button>
            {!form.locationRequired && (
              <button
                type="button"
                onClick={decline}
                disabled={asking}
                className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Continue without sharing
              </button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ---- the form -----------------------------------------------------------

  const inputClass = `w-full min-w-0 rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${theme.field}`;
  const optionClass = `flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${theme.option} ${theme.body}`;

  const renderField = (f: FormField) => {
    const value = answers[f.id];
    const options = normalizeOptions(f);

    if (f.type === 'file') {
      const picked = isFileAnswer(value) ? value : null;
      const busy = uploadingField === f.id;
      if (picked) {
        return (
          <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${theme.card}`}>
            <FiFile className={`h-5 w-5 flex-none ${theme.muted}`} />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${theme.heading}`}>{picked.name}</p>
              <p className={`text-[11px] ${theme.muted}`}>{fmtBytes(picked.size)} · uploaded</p>
            </div>
            <button
              type="button"
              onClick={() => clearAnswer(f.id)}
              title="Choose a different file"
              className={`flex h-8 w-8 flex-none items-center justify-center rounded-full hover:bg-black/5 ${theme.muted}`}
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        );
      }
      return (
        <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-sm font-semibold transition ${theme.field} ${busy ? 'opacity-60' : 'hover:bg-black/5'}`}>
          {busy ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiUploadCloud className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Choose a file'}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            accept={FILE_ACCEPT_ATTR[f.accept || 'any']}
            onChange={(e) => uploadAnswerFile(f, e.target.files?.[0])}
          />
          <span className={`ml-1 text-[11px] font-normal ${theme.muted}`}>up to {f.maxSizeMb || 10} MB</span>
        </label>
      );
    }

    if (f.type === 'long_text') {
      return (
        <textarea
          rows={4}
          className={inputClass}
          placeholder={f.placeholder || ''}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(f.id, e.target.value)}
        />
      );
    }
    if (f.type === 'dropdown') {
      return (
        <select
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(f.id, e.target.value)}
        >
          <option value="">Choose…</option>
          {options.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
        </select>
      );
    }
    if (f.type === 'single_choice') {
      return (
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.label} className={optionClass}>
              <input
                type="radio"
                name={f.id}
                className="mt-0.5 h-4 w-4 flex-none accent-indigo-600"
                checked={value === o.label}
                onChange={() => setAnswer(f.id, o.label)}
              />
              <span className="min-w-0 flex-1">
                <RichView rich={o.rich} text={o.label} />
                {o.media && <span className="mt-2 block"><MediaView media={o.media} small /></span>}
              </span>
            </label>
          ))}
        </div>
      );
    }
    if (f.type === 'multi_choice') {
      const chosen = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.label} className={optionClass}>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 flex-none rounded accent-indigo-600"
                checked={chosen.includes(o.label)}
                onChange={() => toggleMulti(f.id, o.label)}
              />
              <span className="min-w-0 flex-1">
                <RichView rich={o.rich} text={o.label} />
                {o.media && <span className="mt-2 block"><MediaView media={o.media} small /></span>}
              </span>
            </label>
          ))}
        </div>
      );
    }
    const inputType = f.type === 'number' ? 'number'
      : f.type === 'email' ? 'email'
      : f.type === 'phone' ? 'tel'
      : f.type === 'date' ? 'date' : 'text';
    return (
      <input
        type={inputType}
        className={inputClass}
        placeholder={f.placeholder || ''}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setAnswer(f.id, e.target.value)}
      />
    );
  };

  return (
    <Shell theme={theme} headerImageUrl={form.headerImageUrl}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (!submitting) submit(); }}
        className="space-y-4"
      >
        <div className={`${card} overflow-hidden`}>
          <div className={`h-1.5 ${theme.bar}`} />
          <div className="px-6 py-5">
            <h1 className={`text-xl font-bold ${theme.heading}`}>{form.title}</h1>
            {form.description && <p className={`mt-2 whitespace-pre-wrap text-sm ${theme.body}`}>{form.description}</p>}
            {data.autofill && (
              <div className={`mt-4 rounded-xl px-4 py-3 text-xs ${theme.dark ? 'bg-white/5 text-slate-300' : 'bg-gray-50 text-gray-600'}`}>
                Answering as <span className={`font-semibold ${theme.heading}`}>{data.autofill.name}</span>
                {data.autofill.registrationNumber && <> · {data.autofill.registrationNumber}</>}
                {data.autofill.session && <> · {data.autofill.session}</>}
              </div>
            )}
          </div>
        </div>

        {/* A public form has no account to read these from, so it asks. */}
        {form.audience === 'PUBLIC' && (
          <div className={`${card} space-y-4 px-6 py-5`}>
            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${theme.heading}`}>Your name</label>
              <input className={inputClass} value={typed.name} onChange={(e) => setTyped((t) => ({ ...t, name: e.target.value }))} />
            </div>
            <div>
              <label className={`mb-1.5 block text-sm font-semibold ${theme.heading}`}>
                Your email <span className={`font-normal ${theme.muted}`}>(optional)</span>
              </label>
              <input type="email" className={inputClass} value={typed.email} onChange={(e) => setTyped((t) => ({ ...t, email: e.target.value }))} />
            </div>
          </div>
        )}

        {(form.fields || []).map((f, i) => (
          <div key={f.id} className={`${card} px-6 py-5`}>
            <label className={`mb-1.5 block text-sm font-semibold ${theme.heading}`}>
              <span className={`mr-1.5 ${theme.muted}`}>{i + 1}.</span>
              <RichView rich={f.labelRich} text={f.label} />
              {f.required && <span className="ml-1 text-rose-500">*</span>}
            </label>
            {(f.helpRich || f.help) && (
              <p className={`mb-2.5 text-xs ${theme.muted}`}>
                <RichView rich={f.helpRich} text={f.help} />
              </p>
            )}
            {f.media && <div className="mb-3"><MediaView media={f.media} /></div>}
            <div className={isChoice(f.type) ? 'mt-2.5' : ''}>{renderField(f)}</div>
          </div>
        ))}

        {/* What is about to be sent alongside the answers. */}
        {(form.collectLocation || form.collectDevice) && (
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-[11px] ${theme.muted}`}>
            {form.collectLocation && (
              <span className="inline-flex items-center gap-1.5">
                <FiMapPin className="h-3 w-3" />
                {location?.status === 'GRANTED'
                  ? `Location shared (±${Math.round(location.accuracy || 0)} m)`
                  : location?.status === 'UNAVAILABLE' ? 'Location unavailable' : 'Location not shared'}
              </span>
            )}
            {form.collectDevice && (
              <span className="inline-flex items-center gap-1.5">
                <FiSmartphone className="h-3 w-3" />
                {device && !deviceDeclined ? `${device.browser} on ${device.os}` : 'Device not shared'}
              </span>
            )}
          </div>
        )}

        {blockedByLocation && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <FiAlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <div className="min-w-0">
              <p className="font-semibold">This form needs your location.</p>
              <p className="mt-0.5 text-xs">
                Allow location for this site in your browser, then
                <button type="button" onClick={() => window.location.reload()} className="ml-1 font-semibold underline">reload the page</button>.
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <FiAlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span className="min-w-0">{submitError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="submit"
            disabled={submitting || blockedByLocation || !!uploadingField}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition disabled:opacity-50 ${theme.button}`}
          >
            {submitting ? <><FiLoader className="h-4 w-4 animate-spin" /> Sending…</> : 'Submit'}
          </button>
        </div>
      </form>
    </Shell>
  );
}
