'use client';

// A scanning point.
//
// This page needs no sign-in — it is opened from a display link, so one form
// can run several screens at once: a gate, a hall door, a registration desk.
// The code on it rotates on a timer, and each one carries a signed token that
// dies with it, so a photograph of the screen goes stale within seconds.
//
// Whether that actually closes the door is the form's own setting. With
// "only open from the live QR code" off, the plain link still works and this
// screen is merely convenient; the banner at the bottom says which it is.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FiLoader, FiMaximize2, FiMinimize2, FiDownload, FiRefreshCw,
  FiAlertTriangle, FiShield, FiLink, FiCheck, FiSlash,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import { downloadQr, qrDataUrl, safeFileName } from '@/app/lib/qr';

type Display = {
  title: string;
  slug: string;
  token: string;
  path: string;
  windowSeconds: number;
  requireQrToken: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  open: boolean;
  reason: string | null;
};

export default function FormDisplayPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '');

  const [info, setInfo] = useState<Display | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [nextAt, setNextAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const key = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // Read on the client: useSearchParams would force a Suspense boundary
      // around the whole page at build time.
      if (key.current === null) key.current = new URLSearchParams(window.location.search).get('key') || '';
      const res = await apiClient.get(`/f/${encodeURIComponent(slug)}/display`, { params: { key: key.current } });
      const data: Display = res.data;
      setInfo(data);
      if (data.open) {
        setImage(await qrDataUrl(`${window.location.origin}${data.path}`, 1000));
        setNextAt(Date.now() + (data.windowSeconds || 20) * 1000);
      } else {
        setImage(null);
      }
      setError(null);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      setError(err.response?.data?.message || 'Could not reach the portal for a fresh code.');
    } finally {
      busy.current = false;
    }
  }, [slug]);

  useEffect(() => { if (slug) refresh(); }, [slug, refresh]);

  // Rotate, at whatever pace the form asks for.
  useEffect(() => {
    const every = Math.max(10, info?.windowSeconds || 20) * 1000;
    const timer = setInterval(() => { refresh(); }, every);
    return () => clearInterval(timer);
  }, [info?.windowSeconds, refresh]);

  useEffect(() => {
    const tick = setInterval(() => setRemaining(Math.max(0, Math.ceil((nextAt - Date.now()) / 1000))), 250);
    return () => clearInterval(tick);
  }, [nextAt]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.error('This browser would not go full screen.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Display link copied — open it on another screen');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy the address bar by hand.');
    }
  };

  const saveStatic = async () => {
    if (!info) return;
    try {
      await downloadQr(`${window.location.origin}/f/${info.slug}`, `${safeFileName(info.title)}-qr`);
      toast.success('Saved — that one is the permanent link, not the rotating code');
    } catch {
      toast.error('Could not build the QR code');
    }
  };

  const windowSeconds = info?.windowSeconds || 20;
  const fraction = windowSeconds > 0 ? Math.min(1, Math.max(0, remaining / windowSeconds)) : 0;
  const CIRCUMFERENCE = 2 * Math.PI * 46;
  const dead = !!error && !info;

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 px-4 py-5 text-white">
      <div className={`mx-auto flex w-full max-w-5xl flex-wrap items-center justify-end gap-2 ${fullscreen ? 'hidden' : ''}`}>
        {!dead && (
          <>
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
              {copied ? <><FiCheck className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><FiLink className="h-3.5 w-3.5" /> Copy this display link</>}
            </button>
            <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
              <FiRefreshCw className="h-3.5 w-3.5" /> New code now
            </button>
            <button type="button" onClick={saveStatic} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
              <FiDownload className="h-3.5 w-3.5" /> Download the static code
            </button>
            <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200">
              <FiMaximize2 className="h-3.5 w-3.5" /> Full screen
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        {dead ? (
          <div className="max-w-md text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
              <FiSlash className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-bold">This screen is not live</h1>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold sm:text-4xl">{info?.title || 'Loading…'}</h1>
              <p className="mt-2 text-sm text-slate-400">Scan with your phone camera to open the form</p>
            </div>

            {info && !info.open ? (
              <div className="max-w-md rounded-2xl bg-white/5 px-6 py-10 text-center ring-1 ring-white/10">
                <FiSlash className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3 text-lg font-semibold">Not accepting responses</p>
                <p className="mt-1 text-sm text-slate-400">
                  {info.reason || (info.status === 'DRAFT' ? 'This form has not been published yet.' : 'This form is closed.')}
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="QR code for this form" className="h-[min(62vh,30rem)] w-[min(62vh,30rem)] object-contain" />
                  ) : (
                    <div className="flex h-[min(62vh,30rem)] w-[min(62vh,30rem)] items-center justify-center text-slate-400">
                      <FiLoader className="h-10 w-10 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="absolute -right-3 -top-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 shadow-lg ring-1 ring-white/10">
                  <svg viewBox="0 0 100 100" className="absolute h-20 w-20 -rotate-90">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke={fraction > 0.4 ? '#34d399' : fraction > 0.15 ? '#fbbf24' : '#fb7185'}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
                      style={{ transition: 'stroke-dashoffset 250ms linear' }}
                    />
                  </svg>
                  <span className="relative text-lg font-bold tabular-nums">{remaining}</span>
                </div>
              </div>
            )}

            {error ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
                <FiAlertTriangle className="h-4 w-4" /> {error}
              </p>
            ) : info?.open && info.requireQrToken ? (
              <p className="inline-flex max-w-xl items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-center text-xs text-emerald-200 sm:text-sm">
                <FiShield className="h-4 w-4 flex-none" />
                This code expires in {remaining}s. A screenshot of it will not open the form.
              </p>
            ) : info?.open ? (
              <p className="inline-flex max-w-xl items-start gap-2 rounded-2xl bg-amber-500/10 px-4 py-2.5 text-left text-xs text-amber-200 sm:text-sm">
                <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>
                  The code rotates every {windowSeconds}s, but this form still accepts its plain
                  link — so a shared screenshot can be worked around. Turn on “only open from the
                  live QR code” in the form’s settings to close that.
                </span>
              </p>
            ) : null}
          </>
        )}

        {fullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5"
          >
            <FiMinimize2 className="h-3.5 w-3.5" /> Leave full screen
          </button>
        )}
      </div>
    </div>
  );
}
