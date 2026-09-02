'use client';

import { useEffect, useState } from 'react';
import { FiAward, FiX, FiCalendar, FiHash } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import CertificateView, { CertField } from './CertificateView';

type Certification = {
  id: string;
  title: string;
  description: string | null;
  templateWidth: number | null;
  templateHeight: number | null;
  fields: CertField[];
};
type Assignment = {
  id: string;
  certificateNumber: string;
  fieldValues: Record<string, string>;
  issuedAt: string;
  Certification: Certification | null;
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

// studentId omitted → current user's own certificates (/my).
export default function StudentCertificates({ studentId }: { studentId?: string }) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Assignment | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const url = studentId ? `/certifications/student/${studentId}` : '/certifications/my';
        const res = await apiClient.get(url);
        setRows(res.data.certificates || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load certificates');
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading certificates…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
        <FiAward className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No certificates yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelected(a)}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow"
          >
            <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <FiAward className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">{a.Certification?.title || 'Certificate'}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1"><FiCalendar className="h-3 w-3" /> {fmt(a.issuedAt)}</span>
                <span className="inline-flex items-center gap-1"><FiHash className="h-3 w-3" /> {a.certificateNumber}</span>
              </div>
              <span className="mt-2 inline-block text-xs font-semibold text-blue-700">View &amp; download →</span>
            </div>
          </button>
        ))}
      </div>

      {selected && selected.Certification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selected.Certification.title}</h3>
                <p className="text-xs text-gray-500">Certificate No. {selected.certificateNumber} · Issued {fmt(selected.issuedAt)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <CertificateView
              certificationId={selected.Certification.id}
              title={selected.Certification.title}
              templateWidth={selected.Certification.templateWidth}
              templateHeight={selected.Certification.templateHeight}
              fields={selected.Certification.fields || []}
              values={selected.fieldValues}
              certificateNumber={selected.certificateNumber}
            />
          </div>
        </div>
      )}
    </div>
  );
}
