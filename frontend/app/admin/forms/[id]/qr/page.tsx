'use client';

// The display screen: a QR code on a projector or a monitor that rotates on a
// timer. Each code carries a token that dies with it, so a photograph of the
// screen passed around afterwards opens nothing.
//
// Whether that actually closes the door depends on the form's own setting: if
// "only open from the live QR code" is off, the plain link still works and
// this is just a convenience. The screen says which of the two it is.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiLoader, FiMaximize2, FiMinimize2, FiDownload,
  FiRefreshCw, FiAlertTriangle, FiShield,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { FormSummary } from '@/app/lib/forms';
import { downloadQr, qrDataUrl, safeFileName } from '@/app/lib/qr';

const ADMIN_ROLES = ['ADMIN', 'HOD', 'COORDINATOR'];

function Content() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [form, setForm] = useState<FormSummary | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [windowSeconds, setWindowSeconds] = useState(20);
  const [nextAt, setNextAt] = useState<number>(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await apiClient.get(`/forms/${id}/qr-token`);
      const url = `${window.location.origin}${res.data.path}`;
      setImage(await qrDataUrl(url, 1000));
      const secs = Number(res.data.windowSeconds) || 20;
      setWindowSeconds(secs);
      setNextAt(Date.now() + secs * 1000);
      setError(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Could not get a fresh code.');
    } finally {
      busy.current = false;
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/forms/${id}`)
      .then((res) => setForm(res.data.form))
      .catch(() => setError('Could not load the form.'));
    refresh();
  }, [id, refresh]);

  // Rotate. The interval is rebuilt whenever the window length changes.
  useEffect(() => {
    const timer = setInterval(() => { refresh(); }, Math.max(10, windowSeconds) * 1000);
    return () => clearInterval(timer);
  }, [windowSeconds, refresh]);

  // The countdown ring.
  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((nextAt - Date.now()) / 1000)));
    }, 250);
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

  const saveStatic = async () => {
    if (!form) return;
    try {
      await downloadQr(`${window.location.origin}/f/${form.slug}`, `${safeFileName(form.title)}-qr`);
      toast.success('Saved — this one is the permanent link, not the rotating code');
    } catch {
      toast.error('Could not build the QR code');
    }
  };

  const fraction = windowSeconds > 0 ? Math.min(1, Math.max(0, remaining / windowSeconds)) : 0;
  const CIRCUMFERENCE = 2 * Math.PI * 46;

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 px-4 py-5 text-white">
      {/* chrome, hidden once the screen is full */}
      <div className={`mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 ${fullscreen ? 'hidden' : ''}`}>
        <Link href={`/admin/forms/${id}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
          <FiArrowLeft className="h-3.5 w-3.5" /> Back to the form
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={refresh} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
            <FiRefreshCw className="h-3.5 w-3.5" /> New code now
          </button>
          <button type="button" onClick={saveStatic} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
            <FiDownload className="h-3.5 w-3.5" /> Download the static code
          </button>
          <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200">
            <FiMaximize2 className="h-3.5 w-3.5" /> Full screen
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold sm:text-4xl">{form?.title || 'Loading…'}</h1>
          <p className="mt-2 text-sm text-slate-400">Scan with your phone camera to open the form</p>
        </div>

        <div className="relative">
          <div className="rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt="QR code for this form"
                className="h-[min(62vh,30rem)] w-[min(62vh,30rem)] object-contain"
              />
            ) : (
              <div className="flex h-[min(62vh,30rem)] w-[min(62vh,30rem)] items-center justify-center text-slate-400">
                <FiLoader className="h-10 w-10 animate-spin" />
              </div>
            )}
          </div>

          {/* the countdown ring */}
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

        {error ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
            <FiAlertTriangle className="h-4 w-4" /> {error}
          </p>
        ) : form?.requireQrToken ? (
          <p className="inline-flex max-w-xl items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-center text-xs text-emerald-200 sm:text-sm">
            <FiShield className="h-4 w-4 flex-none" />
            This code expires in {remaining}s. A screenshot of it will not open the form.
          </p>
        ) : (
          <p className="inline-flex max-w-xl items-start gap-2 rounded-2xl bg-amber-500/10 px-4 py-2.5 text-left text-xs text-amber-200 sm:text-sm">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              The code rotates every {windowSeconds}s, but this form still accepts its plain link —
              so a shared screenshot can be worked around. Turn on “only open from the live QR code”
              in the form’s settings to close that.
            </span>
          </p>
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

export default function FormQrPage() {
  return (
    <ProtectedRoute requiredRoles={ADMIN_ROLES}>
      <Content />
    </ProtectedRoute>
  );
}
