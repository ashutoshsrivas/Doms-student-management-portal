'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText, FiUpload, FiExternalLink } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Noc = {
  id: string;
  nocUrl: string;
  nocFileName: string;
  uploadedAt: string | null;
  issueDate: string | null;
  sessionName: string;
};

const fmt = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

function Content() {
  const [nocs, setNocs] = useState<Noc[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await apiClient.get('/noc/me');
      setNocs(res.data.nocs || []);
      setCurrentSession(res.data.currentSession || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load your NOC');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(ext)) {
      toast.error('Only PDF, DOC or DOCX files are allowed');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File is larger than 25 MB');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('noc', file);
      await apiClient.post('/noc/upload', fd);
      toast.success('NOC uploaded');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to upload NOC');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // The NOC for the student's current session (what an upload replaces).
  const current = nocs.find((n) => !currentSession || n.sessionName === currentSession) || null;
  const older = nocs.filter((n) => n !== current);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload NOC</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your No-Objection Certificate (for SIP or anything else). PDF, DOC or DOCX, up to 25 MB.
          {currentSession && <> It will be attached to <span className="font-semibold text-gray-700">{currentSession}</span>.</>}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="py-6 text-center text-sm text-gray-500">Loading…</div>
        ) : (
          <>
            {current ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <FiFileText className="h-4 w-4 text-emerald-700" />
                  <span className="font-semibold text-gray-900">{current.nocFileName || 'NOC'}</span>
                  <a href={current.nocUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">
                    <FiExternalLink className="h-3.5 w-3.5" /> View
                  </a>
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Uploaded {fmt(current.uploadedAt)}
                  {current.issueDate && <> · Issue date {fmt(current.issueDate)}</>}
                </div>
              </div>
            ) : (
              <p className="mb-4 text-sm text-gray-500 italic">You haven&apos;t uploaded an NOC yet.</p>
            )}

            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              <FiUpload className="h-4 w-4" />
              {uploading ? 'Uploading…' : current ? 'Replace NOC' : 'Upload NOC'}
            </button>

            {older.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Other sessions</div>
                <ul className="space-y-1 text-sm">
                  {older.map((n) => (
                    <li key={n.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-gray-700">{n.sessionName || '—'}</span>
                      <a href={n.nocUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                        {n.nocFileName || 'View'}
                      </a>
                      <span className="text-xs text-gray-500">{fmt(n.uploadedAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function StudentNocPage() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
