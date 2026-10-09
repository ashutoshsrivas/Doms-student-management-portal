'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText, FiSearch, FiStar, FiCalendar, FiImage, FiVideo, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import useAuthStore from '@/app/store/authStore';

type Media = { id: string; url: string; kind: 'IMAGE' | 'VIDEO'; fileName: string; sizeBytes: number | null };
type Contribution = {
  id: string; title: string; category: string; description: string; achievedOn: string | null;
  ownerName: string; ownerEmail: string; ownerRole: string; department: string; media: Media[];
};
type EventRow = {
  id: string; title: string; startAt: string | null; endAt: string | null; venue: string;
  description: string; status: string; imageUrl: string | null; videoUrl: string | null; reportUrl: string | null;
};

const fmt = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthsAgoISO = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

function Content() {
  const { user } = useAuthStore();
  const [from, setFrom] = useState(monthsAgoISO(3));
  const [to, setTo] = useState(todayISO());
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tab, setTab] = useState<'contributions' | 'events'>('contributions');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = ['ADMIN', 'HOD'].includes(user?.role || '')
    || !!(user as { socialMediaManager?: boolean } | null)?.socialMediaManager;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/social-media/overview', { params: { from, to } });
      setContributions(data.contributions || []);
      setEvents(data.events || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const visibleContributions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contributions;
    return contributions.filter((c) =>
      [c.title, c.category, c.ownerName, c.department, c.description].some((v) => (v || '').toLowerCase().includes(q)));
  }, [contributions, query]);

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => [e.title, e.venue, e.description].some((v) => (v || '').toLowerCase().includes(q)));
  }, [events, query]);

  const rangeLabel = `${fmt(from) || 'start'} to ${fmt(to) || 'today'}`;

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const cRows = visibleContributions.map((c) => ({
        Date: c.achievedOn || '',
        Title: c.title,
        Category: c.category,
        'Faculty': c.ownerName,
        'Role': c.ownerRole,
        'Domain': c.department,
        Email: c.ownerEmail,
        Photos: c.media.filter((m) => m.kind === 'IMAGE').length,
        Videos: c.media.filter((m) => m.kind === 'VIDEO').length,
        'Media links': c.media.map((m) => m.url).join('\n'),
        Description: c.description,
      }));
      const ws1 = XLSX.utils.json_to_sheet(cRows);
      ws1['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 50 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Contributions');

      const eRows = visibleEvents.map((e) => ({
        Date: e.startAt ? String(e.startAt).slice(0, 10) : '',
        Title: e.title,
        Venue: e.venue,
        Status: e.status,
        Image: e.imageUrl || '',
        Video: e.videoUrl || '',
        Report: e.reportUrl || '',
        Description: e.description,
      }));
      const ws2 = XLSX.utils.json_to_sheet(eRows);
      ws2['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 22 }, { wch: 12 }, { wch: 46 }, { wch: 46 }, { wch: 46 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Events');

      const ws0 = XLSX.utils.json_to_sheet([
        { Metric: 'Range', Value: rangeLabel },
        { Metric: 'Contributions', Value: cRows.length },
        { Metric: 'Events', Value: eRows.length },
        { Metric: 'Photos attached', Value: visibleContributions.reduce((n, c) => n + c.media.filter((m) => m.kind === 'IMAGE').length, 0) },
        { Metric: 'Videos attached', Value: visibleContributions.reduce((n, c) => n + c.media.filter((m) => m.kind === 'VIDEO').length, 0) },
        { Metric: 'Downloaded on', Value: new Date().toLocaleString() },
      ]);
      ws0['!cols'] = [{ wch: 22 }, { wch: 34 }];
      XLSX.utils.book_append_sheet(wb, ws0, 'Summary');

      XLSX.writeFile(wb, `social-media-report-${from || 'start'}-to-${to || 'today'}.xlsx`);
      toast.success('Excel downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to build the Excel file');
    }
  };

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.text('Social Media Report', 14, 16);
      doc.setFontSize(10);
      doc.text(`${rangeLabel} · ${visibleContributions.length} contribution(s), ${visibleEvents.length} event(s)`, 14, 23);

      autoTable(doc, {
        startY: 29,
        head: [['Date', 'Title', 'Category', 'Faculty', 'Photos', 'Videos']],
        body: visibleContributions.map((c) => [
          c.achievedOn || '', c.title, c.category, c.ownerName,
          String(c.media.filter((m) => m.kind === 'IMAGE').length),
          String(c.media.filter((m) => m.kind === 'VIDEO').length),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      const afterFirst = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 40;
      doc.setFontSize(12);
      doc.text('Events', 14, afterFirst + 10);
      autoTable(doc, {
        startY: afterFirst + 14,
        head: [['Date', 'Title', 'Venue', 'Status']],
        body: visibleEvents.map((e) => [e.startAt ? String(e.startAt).slice(0, 10) : '', e.title, e.venue, e.status]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [13, 148, 136] },
      });

      doc.save(`social-media-report-${from || 'start'}-to-${to || 'today'}.pdf`);
      toast.success('PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to build the PDF');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error('Title is required'); return; }
    try {
      setSaving(true);
      await apiClient.patch(`/schedule/achievements/${editing.id}`, {
        title: editing.title,
        category: editing.category || null,
        description: editing.description || null,
        achievedOn: editing.achievedOn || null,
      });
      toast.success('Contribution updated');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeContribution = async (c: Contribution) => {
    if (!confirm(`Delete "${c.title}" by ${c.ownerName}? Its photos and videos go too.`)) return;
    try {
      await apiClient.delete(`/schedule/achievements/${c.id}`);
      toast.success('Deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const photoCount = visibleContributions.reduce((n, c) => n + c.media.filter((m) => m.kind === 'IMAGE').length, 0);
  const videoCount = visibleContributions.reduce((n, c) => n + c.media.filter((m) => m.kind === 'VIDEO').length, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every contribution and event in one place, with the photos and videos attached to them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
            <FiDownload className="h-4 w-4" /> Excel
          </button>
          <button type="button" onClick={exportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            <FiFileText className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        </div>
        <div className="flex gap-1">
          {[['Last month', 1], ['3 months', 3], ['6 months', 6], ['1 year', 12]].map(([label, months]) => (
            <button key={String(label)} type="button"
              onClick={() => { setFrom(monthsAgoISO(Number(months))); setTo(todayISO()); }}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              {label}
            </button>
          ))}
          <button type="button" onClick={() => { setFrom(''); setTo(''); }}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            All time
          </button>
        </div>
        <div className="relative ml-auto">
          <FiSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, faculty, venue…"
            className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Contributions', value: visibleContributions.length },
          { label: 'Events', value: visibleEvents.length },
          { label: 'Photos', value: photoCount },
          { label: 'Videos', value: videoCount },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(['contributions', 'events'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === t ? 'bg-indigo-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
            {t === 'contributions' ? `Contributions (${visibleContributions.length})` : `Events (${visibleEvents.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
      ) : tab === 'contributions' ? (
        visibleContributions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            No contributions in this range.
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleContributions.map((c) => (
              <li key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <FiStar className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-gray-900">{c.title}</span>
                      {c.category && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">{c.category}</span>}
                      {c.achievedOn && <span className="text-xs text-gray-500">{fmt(c.achievedOn)}</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-600">
                      {c.ownerName}{c.department ? ` · ${c.department}` : ''}
                    </div>
                    {c.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{c.description}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditing({ ...c })} title="Edit"
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><FiEdit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => removeContribution(c)} title="Delete"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"><FiTrash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
                {c.media.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.media.map((m) => (
                      <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" title={m.fileName}>
                        {m.kind === 'IMAGE' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.url} alt={m.fileName} className="h-20 w-20 rounded object-cover border border-gray-200" />
                        ) : (
                          <span className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded border border-gray-200 bg-gray-50 text-gray-600">
                            <FiVideo className="h-5 w-5" /><span className="text-[10px]">Video</span>
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      ) : visibleEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          No events in this range.
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleEvents.map((e) => (
            <li key={e.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <FiCalendar className="h-4 w-4 text-teal-600" />
                <span className="font-semibold text-gray-900">{e.title}</span>
                {e.status && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">{e.status}</span>}
                <span className="text-xs text-gray-500">{fmt(e.startAt)}{e.venue ? ` · ${e.venue}` : ''}</span>
              </div>
              {e.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{e.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {e.imageUrl && <a href={e.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700"><FiImage className="h-3.5 w-3.5" /> Image</a>}
                {e.videoUrl && <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700"><FiVideo className="h-3.5 w-3.5" /> Video</a>}
                {e.reportUrl && <a href={e.reportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700"><FiFileText className="h-3.5 w-3.5" /> Report</a>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold">Edit contribution</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Title</label>
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" maxLength={250} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Category</label>
                <input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" maxLength={120} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Date</label>
                <input type="date" value={editing.achievedOn || ''} onChange={(e) => setEditing({ ...editing, achievedOn: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Description</label>
                <textarea rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" maxLength={4000} />
              </div>
              <p className="text-[11px] text-gray-500">Editing {editing.ownerName}&apos;s contribution.</p>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveEdit} disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SocialMediaPage() {
  // Non-admins reach this only when an admin has given them the duty; the
  // server refuses anyone else.
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
