'use client';

// The owner's way in to the display screen.
//
// There is only one display screen — the public one at /display/<slug> —
// because a scanning point has to work on a screen nobody has signed in on.
// This page fetches the form's display link and steps aside, so the address
// the owner ends up on is the one they can hand to every other screen.

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiLoader, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import ProtectedRoute from '@/app/components/ProtectedRoute';

const ADMIN_ROLES = ['ADMIN', 'HOD', 'COORDINATOR'];

function Content() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!id || asked.current) return;
    asked.current = true;
    apiClient.get(`/forms/${id}/display-link`)
      .then((res) => router.replace(res.data.path))
      .catch((e) => setError(e?.response?.data?.message || 'Could not open the display screen.'));
  }, [id, router]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-white">
      {error ? (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            <FiAlertCircle className="h-6 w-6" />
          </span>
          <p className="max-w-sm text-center text-sm text-slate-300">{error}</p>
          <Link href={`/admin/forms/${id}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
            <FiArrowLeft className="h-3.5 w-3.5" /> Back to the form
          </Link>
        </>
      ) : (
        <>
          <FiLoader className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400">Opening the display screen…</p>
        </>
      )}
    </div>
  );
}

export default function FormQrRedirectPage() {
  return (
    <ProtectedRoute requiredRoles={ADMIN_ROLES}>
      <Content />
    </ProtectedRoute>
  );
}
