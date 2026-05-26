'use client';

// Event Calendar — single page for all roles.
// - Month-grid calendar (lightweight, no external date lib).
// - Click a day to focus its event list on the right.
// - Click any event chip / list item to open a detail modal.
// - Faculty/admin (any CREATOR_ROLE) sees "+ New Event" button.
// - Creator + admin can edit/delete; creator can upload a post-event report
//   (which is visible only to the creator and admin — backend scrubs it
//   from the response for everyone else).

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FiChevronLeft, FiChevronRight, FiPlus, FiX, FiCalendar, FiClock,
  FiMapPin, FiLink, FiEdit2, FiTrash2, FiUploadCloud, FiImage,
  FiVideo, FiPaperclip, FiFileText, FiExternalLink, FiLoader,
  FiLock, FiDownload,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import { generateEventReportPDF } from '@/app/lib/eventReportPdf';

// =========== Types ===========

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  venue?: string | null;
  startAt: string;
  endAt?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  registrationUrl?: string | null;
  postReportUrl?: string | null;       // only present for creator + admin
  postReportName?: string | null;
  postReportMime?: string | null;
  postReportUploadedAt?: string | null;
  status: 'SCHEDULED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  Creator?: { id: string; firstName: string; lastName: string | null; email: string; approvedRole: string };
}

const CREATOR_ROLES = ['ADMIN', 'HOD', 'FACULTY', 'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR'];
const IMG_MAX = 10 * 1024 * 1024;
const VID_MAX = 80 * 1024 * 1024;

// =========== Date helpers (no external lib) ===========

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const monthLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** Returns an array of 42 Date objects (6 weeks) for the month grid. */
function buildMonthGrid(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = firstOfMonth.getDay(); // 0 = Sunday
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - offset);
  const out: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

// =========== Page ===========

export default function EventsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = user ? CREATOR_ROLES.includes(user.role) : false;

  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / edit modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);

  // Detail modal
  const [detail, setDetail] = useState<EventItem | null>(null);

  // Report (admin only)
  const [showReport, setShowReport] = useState(false);
  const [reportRange, setReportRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [reportCustom, setReportCustom] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [reportBusy, setReportBusy] = useState(false);

  const monthCells = useMemo(() => buildMonthGrid(anchor), [anchor]);

  // Fetch events for the visible window (one month + a small buffer)
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const first = monthCells[0];
      const last = monthCells[monthCells.length - 1];
      const from = new Date(first); from.setHours(0, 0, 0, 0);
      const to = new Date(last); to.setHours(23, 59, 59, 999);
      const res = await apiClient.get('/events', { params: { from: from.toISOString(), to: to.toISOString() } });
      setEvents(res.data.events || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [monthCells]);

  useEffect(() => { load(); }, [load]);

  // Group events by dayKey for quick lookup
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      const k = dayKey(new Date(e.startAt));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    // sort each day by time asc
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [events]);

  const selectedDayEvents = eventsByDay.get(dayKey(selectedDay)) || [];

  const todayKey = dayKey(new Date());

  // Build [start, end] ISO strings + label for the chosen range preset
  const resolveRange = (): { start: string; end: string; label: string } | null => {
    const now = new Date();
    if (reportRange === 'today') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start: s.toISOString(), end: e.toISOString(), label: `Today (${s.toLocaleDateString()})` };
    }
    if (reportRange === 'week') {
      // ISO-ish "this week" — Sunday to Saturday containing today
      const dow = now.getDay();
      const start = new Date(now); start.setDate(now.getDate() - dow); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 7); end.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: end.toISOString(), label: `Week of ${start.toLocaleDateString()}` };
    }
    if (reportRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start: start.toISOString(), end: end.toISOString(), label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
    }
    if (reportRange === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { start: start.toISOString(), end: end.toISOString(), label: String(now.getFullYear()) };
    }
    if (!reportCustom.start || !reportCustom.end) { toast.error('Pick both dates'); return null; }
    const s = new Date(reportCustom.start);
    const e = new Date(reportCustom.end);
    e.setHours(23, 59, 59, 999);
    return { start: s.toISOString(), end: e.toISOString(), label: `${s.toLocaleDateString()} – ${new Date(reportCustom.end).toLocaleDateString()}` };
  };

  const handleDownloadReport = async () => {
    const r = resolveRange();
    if (!r) return;
    setReportBusy(true);
    try {
      const res = await apiClient.get('/events/report', { params: { start: r.start, end: r.end } });
      generateEventReportPDF(res.data, r.label);
      toast.success('Report downloaded');
      setShowReport(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report');
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <DashboardLayout title="Event Calendar">
      <div className="py-6 px-2 md:px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Calendar</h1>
            <p className="text-gray-600 mt-1 text-sm">Browse upcoming and past events. Faculty can post new events, register links, and upload post-event reports.</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm"
                title="Download a PDF report of events in a date range"
              >
                <FiDownload /> Export Report
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm"
              >
                <FiPlus /> New Event
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar (col-span-2) */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-1.5 rounded hover:bg-gray-200"
                aria-label="Previous month"
              >
                <FiChevronLeft />
              </button>
              <h2 className="text-lg font-bold text-gray-900">{monthLabel(anchor)}</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => { const today = new Date(); setAnchor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today); }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-gray-300 hover:bg-gray-100 text-gray-700"
                >
                  Today
                </button>
                <button
                  onClick={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="p-1.5 rounded hover:bg-gray-200"
                  aria-label="Next month"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="px-2 py-2 text-center">{d}</div>
              ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7">
              {monthCells.map((d, i) => {
                const inMonth = d.getMonth() === anchor.getMonth();
                const isSelected = isSameDay(d, selectedDay);
                const isToday = dayKey(d) === todayKey;
                const dayEvents = eventsByDay.get(dayKey(d)) || [];
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(d)}
                    className={`h-24 sm:h-28 text-left p-1.5 border border-gray-100 transition relative
                      ${inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                      ${isSelected ? 'ring-2 ring-blue-500 z-10' : 'hover:bg-blue-50'}`}
                  >
                    <div className={`text-xs font-bold mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full
                      ${isToday ? 'bg-blue-600 text-white' : ''}`}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          title={e.title}
                          onClick={(ev) => { ev.stopPropagation(); setDetail(e); }}
                          className={`truncate text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded font-medium cursor-pointer
                            ${e.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500 line-through' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                        >
                          {fmtTime(new Date(e.startAt))} {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-gray-500 font-semibold pl-1">+ {dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day's events (right column) */}
          <aside className="lg:col-span-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-900">{fmtDate(selectedDay)}</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'}
              </p>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-gray-500 flex items-center gap-2"><FiLoader className="animate-spin" /> Loading…</p>
            ) : selectedDayEvents.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 italic">No events on this day.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                {selectedDayEvents.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => setDetail(e)}
                      className="w-full text-left p-3 hover:bg-blue-50"
                    >
                      <p className="font-semibold text-gray-900">{e.title}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1"><FiClock size={11} /> {fmtTime(new Date(e.startAt))}</span>
                        {e.venue && <span className="inline-flex items-center gap-1"><FiMapPin size={11} /> {e.venue}</span>}
                      </div>
                      {e.status === 'CANCELLED' && (
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Cancelled</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>

      {/* Create / edit modal */}
      {showForm && (
        <EventFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      {/* Detail modal */}
      {detail && (
        <EventDetailModal
          event={detail}
          isAdmin={isAdmin}
          currentUserId={user?.id || ''}
          onClose={() => setDetail(null)}
          onEdit={(e) => { setDetail(null); setEditing(e); setShowForm(true); }}
          onChanged={() => { load(); setDetail(null); }}
          onUpdated={(e) => setDetail(e)}
        />
      )}

      {/* Report modal (admin only) */}
      {showReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-emerald-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><FiDownload /> Export Events Report</h3>
              <button onClick={() => setShowReport(false)} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">Date range</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['today', 'week', 'month', 'year', 'custom'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReportRange(r)}
                      className={`px-2 py-1.5 text-xs font-semibold rounded border-2 capitalize ${reportRange === r ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
                    >
                      {r === 'today' ? 'Today' : r === 'week' ? 'Week' : r === 'month' ? 'Month' : r === 'year' ? 'Year' : 'Custom'}
                    </button>
                  ))}
                </div>
              </div>

              {reportRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Start</label>
                    <input
                      type="date"
                      value={reportCustom.start}
                      onChange={(e) => setReportCustom((p) => ({ ...p, start: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">End (inclusive)</label>
                    <input
                      type="date"
                      value={reportCustom.end}
                      onChange={(e) => setReportCustom((p) => ({ ...p, end: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Generates a portrait PDF with a cover (totals, by-status, by-role), a complete events table, and a details section for any event that has a description, registration link, or uploaded report.
              </p>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
              <button onClick={() => setShowReport(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
              <button
                onClick={handleDownloadReport}
                disabled={reportBusy || (reportRange === 'custom' && (!reportCustom.start || !reportCustom.end))}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded font-semibold flex items-center gap-2"
              >
                {reportBusy ? <FiLoader className="animate-spin" /> : <FiDownload />} {reportBusy ? 'Building…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ============================================================================
// Create / Edit modal
// ============================================================================

function EventFormModal({ initial, onClose, onSaved }: {
  initial: EventItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => {
    if (initial) {
      return {
        title: initial.title,
        description: initial.description || '',
        venue: initial.venue || '',
        startAt: initial.startAt.slice(0, 16),
        endAt: initial.endAt ? initial.endAt.slice(0, 16) : '',
        registrationUrl: initial.registrationUrl || '',
      };
    }
    return { title: '', description: '', venue: '', startAt: '', endAt: '', registrationUrl: '' };
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.startAt) { toast.error('Start date/time is required'); return; }
    if (form.registrationUrl && !/^https?:\/\//i.test(form.registrationUrl.trim())) {
      toast.error('Registration link must start with http:// or https://');
      return;
    }
    if (imageFile && imageFile.size > IMG_MAX) {
      toast.error('Image exceeds 10 MB');
      return;
    }
    if (videoFile && videoFile.size > VID_MAX) {
      toast.error('Video exceeds 80 MB');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('venue', form.venue.trim());
      fd.append('startAt', new Date(form.startAt).toISOString());
      if (form.endAt) fd.append('endAt', new Date(form.endAt).toISOString());
      else if (isEdit) fd.append('endAt', ''); // clear
      fd.append('registrationUrl', form.registrationUrl.trim());
      if (imageFile) fd.append('image', imageFile);
      if (videoFile) fd.append('video', videoFile);

      if (isEdit) {
        await apiClient.patch(`/events/${initial!.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event updated');
      } else {
        await apiClient.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event created');
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><FiCalendar /> {isEdit ? 'Edit Event' : 'New Event'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><FiX /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              maxLength={250}
              placeholder="e.g. Industry talk: AI in Finance"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Starts *</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Ends (optional)</label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Venue</label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
              maxLength={500}
              placeholder="e.g. Auditorium / Online"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              maxLength={5000}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Registration link / form URL</label>
            <input
              type="url"
              value={form.registrationUrl}
              onChange={(e) => setForm((p) => ({ ...p, registrationUrl: e.target.value }))}
              placeholder="https://forms.google.com/…  or any external link"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900"
            />
            <p className="text-[11px] text-gray-500 mt-1">Either a Google/MS Form URL or any external registration page.</p>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Event image (≤10 MB, JPG/PNG/WebP/GIF)</label>
            {initial?.imageUrl && !imageFile && (
              <a href={initial.imageUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-700 hover:underline mb-1">
                Current image (click to view) — uploading new file will replace it
              </a>
            )}
            <input
              ref={imgRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-2 justify-center text-sm text-gray-700"
            >
              {imageFile ? (
                <><FiImage /> {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)</>
              ) : (
                <><FiImage /> Choose image</>
              )}
            </button>
          </div>

          {/* Video upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Event video (≤80 MB, MP4/WebM/MOV)</label>
            {initial?.videoUrl && !videoFile && (
              <a href={initial.videoUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-700 hover:underline mb-1">
                Current video (click to view) — uploading new file will replace it
              </a>
            )}
            <input
              ref={vidRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => vidRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-2 justify-center text-sm text-gray-700"
            >
              {videoFile ? (
                <><FiVideo /> {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</>
              ) : (
                <><FiVideo /> Choose video</>
              )}
            </button>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.startAt}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold flex items-center gap-2"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiPlus />} {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create event')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Detail modal
// ============================================================================

function EventDetailModal({ event, isAdmin, currentUserId, onClose, onEdit, onChanged, onUpdated }: {
  event: EventItem;
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onEdit: (e: EventItem) => void;
  onChanged: () => void;
  onUpdated: (e: EventItem) => void;
}) {
  const isCreator = event.createdBy === currentUserId;
  const canEdit = isAdmin || isCreator;
  // Backend already scrubs postReportUrl for non-creator/non-admin, so its
  // presence means we're allowed to see it.
  const canSeeReport = !!event.postReportUrl || isAdmin || isCreator;
  const canUploadReport = isCreator || isAdmin;

  const reportRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/events/${event.id}`);
      toast.success('Event deleted');
      onChanged();
    } catch { toast.error('Failed to delete'); }
  };

  const handleCancel = async () => {
    if (!confirm('Mark this event as cancelled?')) return;
    setCancelling(true);
    try {
      const res = await apiClient.patch(`/events/${event.id}`, { status: 'CANCELLED' });
      onUpdated(res.data.event);
      toast.success('Event cancelled');
    } catch { toast.error('Failed to cancel'); }
    finally { setCancelling(false); }
  };

  const handleUploadReport = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('report', file);
      const res = await apiClient.post(`/events/${event.id}/report`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpdated(res.data.event);
      toast.success('Report uploaded');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to upload report');
    } finally { setUploading(false); }
  };

  const handleRemoveReport = async () => {
    if (!confirm('Remove the uploaded report?')) return;
    try {
      await apiClient.delete(`/events/${event.id}/report`);
      toast.success('Report removed');
      // Refetch event so the modal updates
      const res = await apiClient.get(`/events/${event.id}`);
      onUpdated(res.data.event);
    } catch { toast.error('Failed to remove report'); }
  };

  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const isPast = (end || start).getTime() < Date.now();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 min-w-0">
            <FiCalendar className="shrink-0" />
            <span className="truncate">{event.title}</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded shrink-0"><FiX /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {event.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={event.title} className="w-full max-h-72 object-cover" />
          )}

          <div className="p-5 space-y-4">
            {event.status === 'CANCELLED' && (
              <div className="bg-red-50 border border-red-300 rounded p-2 text-sm font-bold text-red-700 text-center">
                THIS EVENT WAS CANCELLED
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1.5"><FiCalendar /> {fmtDate(start)}</span>
              <span className="inline-flex items-center gap-1.5"><FiClock /> {fmtTime(start)}{end ? ` – ${fmtTime(end)}` : ''}</span>
              {event.venue && <span className="inline-flex items-center gap-1.5"><FiMapPin /> {event.venue}</span>}
            </div>

            {event.description && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>
            )}

            {event.registrationUrl && event.status === 'SCHEDULED' && !isPast && (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm"
              >
                <FiLink /> Register / Open link <FiExternalLink size={12} />
              </a>
            )}

            {event.videoUrl && (
              <div>
                <p className="text-xs uppercase font-bold text-gray-500 mb-1">Video</p>
                <video controls src={event.videoUrl} className="w-full max-h-72 rounded bg-black" />
              </div>
            )}

            {event.Creator && (
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                Posted by {event.Creator.firstName} {event.Creator.lastName || ''} ({event.Creator.approvedRole})
              </p>
            )}

            {/* Post-event report — only renders when the viewer can see it */}
            {canSeeReport && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FiLock className="text-amber-700" />
                  <p className="text-xs font-bold uppercase text-amber-900 tracking-wide">Post-event report (creator + admin only)</p>
                </div>
                {event.postReportUrl ? (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <a
                        href={event.postReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded text-sm text-amber-900 hover:bg-amber-100 font-medium"
                      >
                        <FiFileText /> <span className="max-w-[16rem] truncate">{event.postReportName || 'Report'}</span> <FiDownload size={12} />
                      </a>
                      {(isAdmin || isCreator) && (
                        <button
                          onClick={handleRemoveReport}
                          className="text-xs text-red-700 hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {event.postReportUploadedAt && (
                      <p className="text-[11px] text-amber-700 mt-1">Uploaded {new Date(event.postReportUploadedAt).toLocaleString()}</p>
                    )}
                  </>
                ) : canUploadReport ? (
                  <>
                    <input
                      ref={reportRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadReport(f); }}
                      className="hidden"
                    />
                    <button
                      onClick={() => reportRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed border-amber-300 rounded-lg p-3 hover:border-amber-500 hover:bg-amber-100 transition flex items-center gap-2 justify-center text-sm text-amber-900 disabled:opacity-50"
                    >
                      {uploading ? <FiLoader className="animate-spin" /> : <FiUploadCloud />} {uploading ? 'Uploading…' : 'Upload report (PDF/DOC, ≤25 MB)'}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-amber-800 italic">No report uploaded yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 flex-wrap justify-end">
            {event.status === 'SCHEDULED' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <FiPaperclip /> {cancelling ? 'Cancelling…' : 'Cancel event'}
              </button>
            )}
            <button
              onClick={() => onEdit(event)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold inline-flex items-center gap-1"
            >
              <FiEdit2 /> Edit / Reschedule
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold inline-flex items-center gap-1"
            >
              <FiTrash2 /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
