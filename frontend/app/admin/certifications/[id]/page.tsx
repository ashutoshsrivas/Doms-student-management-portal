'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiUploadCloud, FiSave, FiPlus, FiTrash2, FiUsers, FiX, FiSearch, FiCheck, FiEye, FiDownload,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import CertificateView, { CertField } from '@/app/components/Certificates/CertificateView';

type Certification = {
  id: string;
  title: string;
  description: string | null;
  templateImageUrl: string | null;
  templateWidth: number | null;
  templateHeight: number | null;
  fields: CertField[];
  status: string;
};
type Recipient = { id: string; firstName: string | null; lastName: string | null; email: string; registrationNumber?: string | null };
type Assignment = {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  fieldValues?: Record<string, string>;
  Student: Recipient | null;
  IssuedByUser: { firstName: string | null; lastName: string | null } | null;
};

const FIELD_TYPES: { type: string; label: string }[] = [
  { type: 'STUDENT_NAME', label: 'Student name' },
  { type: 'REGISTRATION_NUMBER', label: 'Registration number' },
  { type: 'EMAIL', label: 'Email' },
  { type: 'ISSUE_DATE', label: 'Issue date' },
  { type: 'CERTIFICATE_ID', label: 'Certificate ID' },
  { type: 'CUSTOM_TEXT', label: 'Custom text' },
  { type: 'VERIFY_QR', label: 'Verify QR' },
];
const GRID_STEP = 2.5; // percent — snap granularity
const typeLabel = (t: string) => FIELD_TYPES.find((x) => x.type === t)?.label || t;
const nameOf = (u: Recipient | null) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : '—');

const previewText = (f: CertField) => {
  switch (f.type) {
    case 'STUDENT_NAME': return 'Student Name';
    case 'REGISTRATION_NUMBER': return 'REG-0000';
    case 'EMAIL': return 'student@example.com';
    case 'ISSUE_DATE': return '01 January 2026';
    case 'CERTIFICATE_ID': return 'GESoM-2026-XXXXXXXX';
    case 'CUSTOM_TEXT': return f.value || f.label || 'Custom text';
    default: return f.label;
  }
};

function Builder() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [cert, setCert] = useState<Certification | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<CertField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [snap, setSnap] = useState(true);
  const [viewing, setViewing] = useState<Assignment | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingId = useRef<string | null>(null);
  const snapRef = useRef(snap);
  useEffect(() => { snapRef.current = snap; }, [snap]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/certifications/${id}`);
      const c: Certification = res.data.certification;
      setCert(c);
      setTitle(c.title || '');
      setDescription(c.description || '');
      setFields(Array.isArray(c.fields) ? c.fields : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load certification');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAssignments = useCallback(async () => {
    try {
      const res = await apiClient.get(`/certifications/${id}/assignments`);
      setAssignments(res.data.assignments || []);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { load(); loadAssignments(); }, [load, loadAssignments]);

  // ── Drag placement ──────────────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    const fid = draggingId.current;
    if (!fid || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.min(100, Math.max(0, x));
    y = Math.min(100, Math.max(0, y));
    if (snapRef.current) {
      x = Math.round(x / GRID_STEP) * GRID_STEP;
      y = Math.round(y / GRID_STEP) * GRID_STEP;
    }
    setFields((prev) => prev.map((f) => (f.id === fid ? { ...f, xPct: Math.round(x * 10) / 10, yPct: Math.round(y * 10) / 10 } : f)));
  }, []);
  const onPointerUp = useCallback(() => {
    draggingId.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove]);
  const startDrag = (e: React.PointerEvent, fid: string) => {
    e.preventDefault();
    setSelectedId(fid);
    draggingId.current = fid;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };
  useEffect(() => () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove, onPointerUp]);

  // ── Field ops ───────────────────────────────────────────────
  const addField = (type: string) => {
    const f: CertField = {
      id: (crypto as any).randomUUID ? crypto.randomUUID() : `f_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
      type,
      label: typeLabel(type),
      value: type === 'CUSTOM_TEXT' ? 'Custom text' : '',
      xPct: 50, yPct: 50, fontPct: 5, color: '#111111', fontFamily: 'helvetica', bold: false, align: 'center',
    };
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
  };
  const updateField = (fid: string, patch: Partial<CertField>) =>
    setFields((prev) => prev.map((f) => (f.id === fid ? { ...f, ...patch } : f)));
  const removeField = (fid: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fid));
    if (selectedId === fid) setSelectedId(null);
  };

  const selected = fields.find((f) => f.id === selectedId) || null;

  // ── Template upload ─────────────────────────────────────────
  const onUpload = async (file: File) => {
    try {
      setUploading(true);
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      const fd = new FormData();
      fd.append('image', file);
      fd.append('width', String(dims.w));
      fd.append('height', String(dims.h));
      const res = await apiClient.post(`/certifications/${id}/template`, fd);
      setCert(res.data.certification);
      toast.success('Template uploaded');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    try {
      setSaving(true);
      await apiClient.patch(`/certifications/${id}`, { title: title.trim(), description: description.trim() || null, fields });
      toast.success('Saved');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading…</div>;
  }
  if (!cert) {
    return <div className="p-10 text-center text-sm text-gray-500">Certification not found.</div>;
  }

  const aspect = cert.templateWidth && cert.templateHeight ? `${cert.templateWidth} / ${cert.templateHeight}` : '1.414 / 1';

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => router.push('/admin/certifications')} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><FiArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-gray-900">Design certificate</h1>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            <FiSave className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setShowAssign(true)} disabled={!cert.templateImageUrl}
            title={!cert.templateImageUrl ? 'Upload a template first' : ''}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <FiUsers className="h-4 w-4" /> Assign
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Canvas */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Template</span>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Grid &amp; snap
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                <FiUploadCloud className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : cert.templateImageUrl ? 'Replace image' : 'Upload image'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }} />
              </label>
            </div>
          </div>

          {cert.templateImageUrl ? (
            <div ref={canvasRef} className="relative w-full select-none overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              style={{ aspectRatio: aspect, containerType: 'size' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cert.templateImageUrl} alt="template" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
              {snap && (
                <div className="pointer-events-none absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(to right, rgba(59,130,246,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.15) 1px, transparent 1px)',
                  backgroundSize: `${GRID_STEP}% ${GRID_STEP}%`,
                }} />
              )}
              {fields.map((f) => {
                const isSel = f.id === selectedId;
                if (f.type === 'VERIFY_QR') {
                  return (
                    <div
                      key={f.id}
                      onPointerDown={(e) => startDrag(e, f.id)}
                      className={`absolute flex cursor-move items-center justify-center rounded bg-white/80 text-[8px] font-semibold text-gray-500 ${isSel ? 'outline outline-2 outline-blue-500' : 'outline outline-1 outline-dashed outline-gray-400 hover:outline-blue-300'}`}
                      style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, transform: 'translate(-50%,-50%)', width: `${f.fontPct}cqh`, height: `${f.fontPct}cqh` }}
                    >
                      QR
                    </div>
                  );
                }
                const anchor = f.align === 'left' ? 'translate(0,-50%)' : f.align === 'right' ? 'translate(-100%,-50%)' : 'translate(-50%,-50%)';
                return (
                  <div
                    key={f.id}
                    onPointerDown={(e) => startDrag(e, f.id)}
                    className={`absolute cursor-move whitespace-nowrap rounded px-0.5 ${isSel ? 'outline outline-2 outline-blue-500 bg-blue-500/5' : 'hover:outline hover:outline-1 hover:outline-blue-300'}`}
                    style={{ left: `${f.xPct}%`, top: `${f.yPct}%`, transform: anchor, fontSize: `${f.fontPct}cqh`, color: f.color, fontWeight: f.bold ? 700 : 400, lineHeight: 1, fontFamily: f.fontFamily === 'times' ? 'Georgia, serif' : f.fontFamily === 'courier' ? 'monospace' : 'Helvetica, Arial, sans-serif' }}
                  >
                    {previewText(f)}
                  </div>
                );
              })}
            </div>
          ) : (
            <label className="flex aspect-[1.414/1] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-blue-400 hover:text-blue-500">
              <FiUploadCloud className="h-10 w-10" />
              <span className="mt-2 text-sm font-semibold">Upload the certificate template image</span>
              <span className="text-xs">PNG or JPG · your final design without the dynamic text</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }} />
            </label>
          )}
          <p className="text-[11px] text-gray-400">Tip: drag each field onto the template to position it. Sizes are relative, so the PDF matches this preview.</p>
        </div>

        {/* Fields sidebar */}
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Add field</div>
            <div className="flex flex-wrap gap-1.5">
              {FIELD_TYPES.map((t) => (
                <button key={t.type} type="button" onClick={() => addField(t.type)} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-blue-300 hover:bg-blue-50">
                  <FiPlus className="h-3 w-3" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Fields ({fields.length})</div>
            {fields.length === 0 ? (
              <div className="text-xs italic text-gray-400">No fields yet. Add one above.</div>
            ) : (
              <div className="space-y-1">
                {fields.map((f) => (
                  <div key={f.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${selectedId === f.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <button type="button" onClick={() => setSelectedId(f.id)} className="min-w-0 flex-1 truncate text-left text-gray-800">
                      {f.type === 'CUSTOM_TEXT' ? (f.value || 'Custom text') : typeLabel(f.type)}
                    </button>
                    <button type="button" onClick={() => removeField(f.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><FiTrash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{typeLabel(selected.type)} — properties</div>
              {selected.type === 'CUSTOM_TEXT' && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Text</label>
                  <input value={selected.value || ''} onChange={(e) => updateField(selected.id, { value: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">{selected.type === 'VERIFY_QR' ? 'QR size' : 'Font size'}</label>
                  <input type="range" min={selected.type === 'VERIFY_QR' ? 5 : 2} max={selected.type === 'VERIFY_QR' ? 40 : 20} step={0.5} value={selected.fontPct} onChange={(e) => updateField(selected.id, { fontPct: parseFloat(e.target.value) })} className="w-full" />
                </div>
                {selected.type !== 'VERIFY_QR' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Color</label>
                    <input type="color" value={selected.color} onChange={(e) => updateField(selected.id, { color: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
                  </div>
                )}
              </div>
              {selected.type !== 'VERIFY_QR' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Font</label>
                      <select value={selected.fontFamily || 'helvetica'} onChange={(e) => updateField(selected.id, { fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900">
                        <option value="helvetica">Sans (Helvetica)</option>
                        <option value="times">Serif (Times)</option>
                        <option value="courier">Mono (Courier)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Align</label>
                      <select value={selected.align || 'center'} onChange={(e) => updateField(selected.id, { align: e.target.value as CertField['align'] })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900">
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={!!selected.bold} onChange={(e) => updateField(selected.id, { bold: e.target.checked })} /> Bold
                  </label>
                </>
              )}
              {selected.type === 'VERIFY_QR' && (
                <p className="text-[11px] text-gray-400">Scans to the public verification page for this certificate.</p>
              )}
              <div className="text-[11px] text-gray-400">Position: {selected.xPct}%, {selected.yPct}% — drag on the preview to move.</div>
            </div>
          )}
        </div>
      </div>

      {/* Recipients */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Recipients ({assignments.length})</h2>
        </div>
        {assignments.length === 0 ? (
          <div className="py-6 text-center text-sm italic text-gray-400">No certificates issued yet. Use “Assign” to issue to students.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Certificate No.</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Issued</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{nameOf(a.Student)}</div>
                      <div className="text-[11px] text-gray-500">{a.Student?.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{a.certificateNumber}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{new Date(a.issuedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setViewing(a)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                          <FiEye className="h-3 w-3" /> View
                        </button>
                        <button type="button" onClick={async () => {
                          if (!confirm(`Revoke this certificate from ${nameOf(a.Student)}?`)) return;
                          try { await apiClient.delete(`/certifications/assignments/${a.id}`); toast.success('Revoked'); await loadAssignments(); }
                          catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to revoke'); }
                        }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                          <FiTrash2 className="h-3 w-3" /> Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAssign && (
        <AssignModal
          certificationId={id}
          onClose={() => setShowAssign(false)}
          onAssigned={async () => { setShowAssign(false); await loadAssignments(); await load(); }}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewing(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{nameOf(viewing.Student)}</h3>
                <p className="text-xs text-gray-500">Certificate No. {viewing.certificateNumber}</p>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
            </div>
            <CertificateView
              certificationId={id}
              title={title}
              templateWidth={cert.templateWidth}
              templateHeight={cert.templateHeight}
              fields={fields}
              values={viewing.fieldValues}
              certificateNumber={viewing.certificateNumber}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AssignModal({ certificationId, onClose, onAssigned }: { certificationId: string; onClose: () => void; onAssigned: () => void }) {
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Record<string, Recipient>>({});
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  // Bulk-via-Excel
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/sessions', { params: { page: 1, limit: 100 } });
        setSessions(res.data.sessions || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const downloadTemplate = async () => {
    if (!sessionId) { toast.error('Choose a session first'); return; }
    try {
      setDownloading(true);
      const res = await apiClient.get('/certifications/session-template', { params: { sessionId }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificate-recipients-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  const uploadExcel = async (file: File) => {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post(`/certifications/${certificationId}/assign-excel`, fd);
      const { created, skipped, unmatched } = res.data;
      toast.success(`Issued ${created}${skipped ? ` · ${skipped} already had it` : ''}${unmatched ? ` · ${unmatched} rows unmatched` : ''}`);
      onAssigned();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to process Excel');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/certifications/recipients', { params: search.trim() ? { search: search.trim() } : {} });
        setCandidates(res.data.users || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (u: Recipient) => setSelected((prev) => {
    const next = { ...prev };
    if (next[u.id]) delete next[u.id]; else next[u.id] = u;
    return next;
  });

  const selectedList = Object.values(selected);

  const assign = async () => {
    if (selectedList.length === 0) { toast.error('Select at least one recipient'); return; }
    try {
      setAssigning(true);
      const res = await apiClient.post(`/certifications/${certificationId}/assign`, { studentIds: selectedList.map((u) => u.id) });
      const { created, skipped } = res.data;
      toast.success(`Issued ${created} certificate${created === 1 ? '' : 's'}${skipped ? ` · ${skipped} already had it` : ''}`);
      onAssigned();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Assign certificate</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><FiX className="h-5 w-5" /></button>
        </div>

        {/* Bulk via Excel */}
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bulk assign via Excel</div>
          <p className="mt-1 text-[11px] text-gray-500">Pick a session, download the pre-filled list, delete anyone who shouldn’t get it, then upload.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="min-w-[180px] flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900">
              <option value="">Select session…</option>
              {sessions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <button type="button" onClick={downloadTemplate} disabled={downloading || !sessionId}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              <FiDownload className="h-3.5 w-3.5" /> {downloading ? 'Preparing…' : 'Download template'}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              <FiUploadCloud className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload & assign'}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadExcel(f); e.currentTarget.value = ''; }} />
            </label>
          </div>
        </div>

        <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">or pick manually</div>

        <div className="relative mb-2">
          <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students by name, email, reg. no…" autoFocus className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm text-gray-900" />
        </div>
        {selectedList.length > 0 && <div className="mb-2 text-xs text-gray-500">{selectedList.length} selected</div>}
        <div className="flex-1 overflow-y-auto rounded border border-gray-200">
          {loading ? (
            <div className="py-6 text-center text-sm text-gray-400">Searching…</div>
          ) : candidates.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No students found.</div>
          ) : (
            candidates.map((u) => {
              const chosen = !!selected[u.id];
              return (
                <button key={u.id} type="button" onClick={() => toggle(u)} className={`flex w-full items-center justify-between border-b border-gray-50 px-3 py-2 text-left text-sm last:border-0 ${chosen ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">{nameOf(u)}</span>
                    <span className="block truncate text-[11px] text-gray-500">{u.email}{u.registrationNumber ? ` · ${u.registrationNumber}` : ''}</span>
                  </span>
                  {chosen && <FiCheck className="h-4 w-4 flex-none text-blue-600" />}
                </button>
              );
            })
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={assign} disabled={assigning || selectedList.length === 0} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {assigning ? 'Assigning…' : `Assign${selectedList.length ? ` (${selectedList.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CertificationBuilderPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD']}>
      <DashboardLayout>
        <Builder />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
