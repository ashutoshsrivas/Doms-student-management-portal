'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FiCheckCircle, FiXCircle, FiLoader, FiAward } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';

type VerifyResult = {
  valid: boolean;
  certificateNumber?: string;
  title?: string;
  description?: string | null;
  recipientName?: string;
  issuedAt?: string;
  message?: string;
};

const fmt = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function VerifyCertificatePage() {
  const params = useParams();
  const number = params.number as string;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/verify/${encodeURIComponent(number)}`);
        setResult(res.data);
      } catch (e: any) {
        setResult(e?.response?.data && typeof e.response.data === 'object'
          ? e.response.data
          : { valid: false, message: 'Certificate not found' });
      } finally {
        setLoading(false);
      }
    })();
  }, [number]);

  const valid = result?.valid;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-lg">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://geu.ac.in/frontend/assets/images/geu-logo.webp" alt="Graphic Era University" className="h-10 w-auto object-contain" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Certificate Verification</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-gray-500">
              <FiLoader className="h-7 w-7 animate-spin" />
              <p className="text-sm">Verifying certificate…</p>
            </div>
          ) : valid ? (
            <>
              <div className="flex items-center gap-3 bg-emerald-50 px-6 py-5">
                <FiCheckCircle className="h-8 w-8 flex-none text-emerald-600" />
                <div>
                  <h1 className="text-lg font-bold text-emerald-900">Certificate Verified</h1>
                  <p className="text-xs text-emerald-700">This is a genuine certificate issued by GESoM.</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100 px-6 py-4 text-sm">
                <Row label="Awarded to" value={result?.recipientName || '—'} strong />
                <Row label="Certificate" value={result?.title || '—'} />
                {result?.description && <Row label="Description" value={result.description} />}
                <Row label="Certificate No." value={result?.certificateNumber || '—'} mono />
                <Row label="Issued on" value={fmt(result?.issuedAt)} />
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-6 py-3 text-[11px] text-gray-500">
                <FiAward className="h-3.5 w-3.5 text-amber-500" /> Graphic Era School of Management
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <FiXCircle className="h-10 w-10 text-red-500" />
              <h1 className="text-lg font-bold text-gray-900">Certificate Not Found</h1>
              <p className="max-w-xs text-sm text-gray-500">
                {result?.message || 'We could not verify this certificate. It may be invalid or has been revoked.'}
              </p>
              <p className="text-[11px] text-gray-400">Ref: {number}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="flex-none text-xs font-medium text-gray-500">{label}</span>
      <span className={`text-right text-gray-900 ${strong ? 'text-base font-bold' : 'text-sm'} ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
