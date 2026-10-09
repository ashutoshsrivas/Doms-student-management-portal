'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiShield, FiCheck, FiX } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Candidate = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  hasDuty: boolean;
};

function Content() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyHolders, setOnlyHolders] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/social-media/managers');
      setCandidates(data.candidates || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load access list');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (u: Candidate) => {
    try {
      setBusy(u.id);
      const { data } = await apiClient.post('/social-media/managers', { userId: u.id, enabled: !u.hasDuty });
      toast.success(data.message || 'Updated');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not update access');
    } finally {
      setBusy(null);
    }
  };

  const holders = candidates.filter((c) => c.hasDuty);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (onlyHolders && !c.hasDuty) return false;
      if (!q) return true;
      return [c.name, c.email, c.role, c.department].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [candidates, query, onlyHolders]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Give someone social-media responsibility. They can then see every contribution and event,
          export reports for any date range, and edit them.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <FiShield className="h-4 w-4 text-indigo-500" /> Social media
        </div>
        {holders.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500 italic">Nobody holds this responsibility yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {holders.map((h) => (
              <span key={h.id} className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm text-indigo-800">
                <span className="font-semibold">{h.name}</span>
                <span className="text-xs text-indigo-500">{h.role}</span>
                <button type="button" onClick={() => toggle(h)} title="Remove responsibility"
                  className="text-indigo-400 hover:text-red-600"><FiX className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">Admins and HODs always have this access.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
          <span className="text-sm font-bold text-gray-900">Staff</span>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={onlyHolders} onChange={(e) => setOnlyHolders(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-600" />
            Only those with responsibility
          </label>
          <div className="relative ml-auto">
            <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, role…"
              className="w-64 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900" />
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500 italic">No one matches.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{u.name}</div>
                  <div className="text-[11px] text-gray-500">{u.email} · {u.role}{u.department ? ` · ${u.department}` : ''}</div>
                </div>
                {u.hasDuty && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    <FiCheck className="h-3 w-3" /> Social media
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggle(u)}
                  disabled={busy === u.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                    u.hasDuty
                      ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {busy === u.id ? 'Saving…' : u.hasDuty ? 'Remove' : 'Give responsibility'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AccessManagementPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
