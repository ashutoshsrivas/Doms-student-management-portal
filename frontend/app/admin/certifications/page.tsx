'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FiPlus, FiAward, FiEdit2, FiTrash2, FiUsers, FiImage } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

type Certification = {
  id: string;
  title: string;
  description: string | null;
  templateImageUrl: string | null;
  status: string;
  issuedCount?: number;
};

function Content() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/certifications');
      setCerts(res.data.certifications || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load certifications');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    try {
      setSaving(true);
      const res = await apiClient.post('/certifications', { title: title.trim(), description: description.trim() || null });
      toast.success('Certification created');
      router.push(`/admin/certifications/${res.data.certification.id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This also removes all certificates issued from it.`)) return;
    try {
      await apiClient.delete(`/certifications/${id}`);
      toast.success('Deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certifications</h1>
          <p className="mt-1 text-sm text-gray-500">Design certificate templates, then assign them to students.</p>
        </div>
        <button type="button" onClick={() => { setTitle(''); setDescription(''); setCreating(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <FiPlus className="h-4 w-4" /> New Certification
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : certs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          No certifications yet. Create your first with “New Certification”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex aspect-[1.6/1] items-center justify-center bg-gray-50">
                {c.templateImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.templateImageUrl} alt={c.title} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-gray-300"><FiImage className="h-8 w-8" /><span className="mt-1 text-xs">No template</span></div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <FiAward className="h-4 w-4 flex-none text-amber-500" />
                  <h3 className="truncate text-sm font-bold text-gray-900">{c.title}</h3>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{c.description}</p>}
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600"><FiUsers className="h-3 w-3" /> {c.issuedCount || 0} issued</div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => router.push(`/admin/certifications/${c.id}`)}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                    <FiEdit2 className="h-3 w-3" /> Design &amp; assign
                  </button>
                  <button type="button" onClick={() => remove(c.id, c.title)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    <FiTrash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">New Certification</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Certificate of Completion — Data Analytics" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={create} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Creating…' : 'Create & design'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertificationsPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD']}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
