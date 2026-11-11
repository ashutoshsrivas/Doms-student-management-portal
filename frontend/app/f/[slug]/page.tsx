'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FiCheckCircle, FiLoader, FiLock, FiMapPin, FiSmartphone, FiShield,
  FiAlertCircle, FiArrowRight, FiSlash,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import { FormField, isChoice } from '@/app/lib/forms';
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
  };
  open: boolean;
  reason: string | null;
  autofill: Autofill | null;
  alreadyAnswered: string | null;
};

type Answer = string | string[];

const card = 'rounded-2xl border border-gray-200 bg-white shadow-sm';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full min-w-0 bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 sm:py-14">
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <div className="mb-6 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://geu.ac.in/frontend/assets/images/geu-logo.webp" alt="Graphic Era University" className="h-9 w-auto object-contain" />
      </div>
      {children}
      <p className="mt-6 text-center text-[11px] text-gray-400">Graphic Era School of Management</p>
    </div>
  </div>
);

export default function FillFormPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Loaded | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The consent gate. It is shown every time the page opens — the browser may
  // remember its own permission, but our ask does not persist.
  const [consentDone, setConsentDone] = useState(false);
  const [asking, setAsking] = useState(false);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [device, setDevice] = useState<DeviceSignals | null>(null);
  const [deviceDeclined, setDeviceDeclined] = useState(false);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [typed, setTyped] = useState({ name: '', email: '', registrationNumber: '', session: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await apiClient.get(`/f/${encodeURIComponent(slug)}`);
      setData(res.data);
      setLoginRequired(false);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { loginRequired?: boolean; message?: string } } };
      if (err.response?.data?.loginRequired) setLoginRequired(true);
      else setLoadError(err.response?.data?.message || 'This form could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { if (slug) load(); }, [slug, load]);

  const form = data?.form;
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

  const setAnswer = (id: string, value: Answer) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const toggleMulti = (id: string, option: string) =>
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return { ...prev, [id]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option] };
    });

  const blockedByLocation = !!(form?.collectLocation && form.locationRequired && location?.status !== 'GRANTED');

  const submit = async () => {
    if (!form) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post(`/f/${encodeURIComponent(slug)}`, {
        answers,
        respondent: form.audience === 'PUBLIC' ? typed : undefined,
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
      const err = e as { response?: { data?: { message?: string; loginRequired?: boolean } } };
      if (err.response?.data?.loginRequired) setLoginRequired(true);
      else setSubmitError(err.response?.data?.message || 'Your response could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref = useMemo(
    () => `/auth/login?next=${encodeURIComponent(`/f/${slug}`)}`,
    [slug],
  );

  if (loading) {
    return (
      <Shell>
        <div className={`${card} flex items-center justify-center gap-3 px-6 py-16 text-gray-500`}>
          <FiLoader className="h-5 w-5 animate-spin" /> Loading the form…
        </div>
      </Shell>
    );
  }

  if (loginRequired) {
    return (
      <Shell>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FiLock className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-gray-900">Sign in to continue</h1>
          <p className="mt-2 text-sm text-gray-600">This form is open to portal accounts only. Your name and session will be filled in for you.</p>
          <a
            href={loginHref}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Sign in <FiArrowRight className="h-4 w-4" />
          </a>
        </div>
      </Shell>
    );
  }

  if (loadError || !form) {
    return (
      <Shell>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <FiAlertCircle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-gray-900">Form unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{loadError || 'This form could not be loaded.'}</p>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className={`${card} px-6 py-12 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Response recorded</h1>
          <p className="mt-2 text-sm text-gray-600">Thank you. Your answers to “{form.title}” have been saved.</p>
        </div>
      </Shell>
    );
  }

  if (!data?.open) {
    return (
      <Shell>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <FiSlash className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-gray-900">{form.title}</h1>
          <p className="mt-2 text-sm text-gray-600">{data?.reason || 'This form is not accepting responses.'}</p>
        </div>
      </Shell>
    );
  }

  if (data.alreadyAnswered) {
    return (
      <Shell>
        <div className={`${card} px-6 py-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-gray-900">You have already answered</h1>
          <p className="mt-2 text-sm text-gray-600">This form takes one response per person, and yours is already in.</p>
        </div>
      </Shell>
    );
  }

  // ---- the consent gate ---------------------------------------------------

  if (!consentDone) {
    return (
      <Shell>
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
                  <p className="text-sm font-semibold text-gray-900">Your location</p>
                  <p className="text-xs text-gray-600">
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
                  <p className="text-sm font-semibold text-gray-900">Your device</p>
                  <p className="text-xs text-gray-600">
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
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
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

  const inputClass = 'w-full min-w-0 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

  const renderField = (f: FormField) => {
    const value = answers[f.id];
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
          {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === 'single_choice') {
      return (
        <div className="space-y-2">
          {(f.options || []).map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 transition hover:bg-gray-50 has-checked:border-indigo-300 has-checked:bg-indigo-50/60">
              <input
                type="radio"
                name={f.id}
                className="h-4 w-4 accent-indigo-600"
                checked={value === o}
                onChange={() => setAnswer(f.id, o)}
              />
              <span className="min-w-0">{o}</span>
            </label>
          ))}
        </div>
      );
    }
    if (f.type === 'multi_choice') {
      const chosen = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {(f.options || []).map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 transition hover:bg-gray-50 has-checked:border-indigo-300 has-checked:bg-indigo-50/60">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-indigo-600"
                checked={chosen.includes(o)}
                onChange={() => toggleMulti(f.id, o)}
              />
              <span className="min-w-0">{o}</span>
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
    <Shell>
      <form
        onSubmit={(e) => { e.preventDefault(); if (!submitting) submit(); }}
        className="space-y-4"
      >
        <div className={`${card} overflow-hidden`}>
          <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
          <div className="px-6 py-5">
            <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
            {form.description && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{form.description}</p>}
            {data.autofill && (
              <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                Answering as <span className="font-semibold text-gray-900">{data.autofill.name}</span>
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
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Your name</label>
              <input className={inputClass} value={typed.name} onChange={(e) => setTyped((t) => ({ ...t, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Your email <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="email" className={inputClass} value={typed.email} onChange={(e) => setTyped((t) => ({ ...t, email: e.target.value }))} />
            </div>
          </div>
        )}

        {(form.fields || []).map((f, i) => (
          <div key={f.id} className={`${card} px-6 py-5`}>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">
              <span className="mr-1.5 text-gray-400">{i + 1}.</span>
              {f.label}
              {f.required && <span className="ml-1 text-rose-500">*</span>}
            </label>
            {f.help && <p className="mb-2.5 text-xs text-gray-500">{f.help}</p>}
            <div className={isChoice(f.type) ? 'mt-2.5' : ''}>{renderField(f)}</div>
          </div>
        ))}

        {/* What is about to be sent alongside the answers. */}
        {(form.collectLocation || form.collectDevice) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-[11px] text-gray-500">
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
            disabled={submitting || blockedByLocation}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? <><FiLoader className="h-4 w-4 animate-spin" /> Sending…</> : 'Submit'}
          </button>
        </div>
      </form>
    </Shell>
  );
}
