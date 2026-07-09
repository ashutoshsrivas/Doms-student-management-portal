'use client';

// Weekly schedule editor. Mon–Sat × 8:00–18:00 grid on 15-min slots.
// Blocks are drag-free but stretchable via the duration control in the
// modal. Lunch has an enforced window (12:30–15:00) and 1-hour cap.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiSave, FiPlus, FiTrash2, FiX, FiPrinter, FiRotateCcw, FiAward, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

// -- Grid constants -----------------------------------------------------
const START_MIN = 8 * 60;           // 8:00
const END_MIN = 18 * 60;            // 18:00
const SLOT = 15;                    // minutes
const SLOT_PX = 22;                 // grid pixel height per 15-min slot
const TOTAL_SLOTS = (END_MIN - START_MIN) / SLOT;  // 40

const LUNCH_WINDOW_START = 12 * 60 + 30;
const LUNCH_WINDOW_END = 15 * 60;
const LUNCH_MAX = 60;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type BlockType = 'ACADEMIC' | 'ADMINISTRATIVE' | 'RESEARCH' | 'MENTOR_MENTEE' | 'LUNCH' | 'CUSTOM';

interface WorkBlock {
  id?: string;
  clientId: string;
  userId?: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  blockType: BlockType;
  title: string;
  details?: string | null;
  customLabel?: string | null;
}

const BLOCK_TYPE_META: Record<BlockType, { label: string; chip: string; block: string; border: string }> = {
  ACADEMIC:       { label: 'Academic',        chip: 'bg-blue-100 text-blue-800',        block: 'bg-blue-50 hover:bg-blue-100',     border: 'border-blue-400' },
  ADMINISTRATIVE: { label: 'Administrative',  chip: 'bg-purple-100 text-purple-800',    block: 'bg-purple-50 hover:bg-purple-100', border: 'border-purple-400' },
  RESEARCH:       { label: 'Research',        chip: 'bg-emerald-100 text-emerald-800',  block: 'bg-emerald-50 hover:bg-emerald-100', border: 'border-emerald-400' },
  MENTOR_MENTEE:  { label: 'Mentor–Mentee',   chip: 'bg-amber-100 text-amber-800',      block: 'bg-amber-50 hover:bg-amber-100',   border: 'border-amber-400' },
  LUNCH:          { label: 'Lunch',           chip: 'bg-rose-100 text-rose-800',        block: 'bg-rose-50 hover:bg-rose-100',     border: 'border-rose-400' },
  CUSTOM:         { label: 'Custom',          chip: 'bg-gray-100 text-gray-800',        block: 'bg-gray-50 hover:bg-gray-100',     border: 'border-gray-400' },
};

const minutesToLabel = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
};

const clientId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `c-${Math.random().toString(36).slice(2)}${Date.now()}`;

// Slot picker helper — returns [8:00, 8:15, ...]
const timeChoices = () => {
  const out: { value: number; label: string }[] = [];
  for (let m = START_MIN; m <= END_MIN; m += SLOT) {
    out.push({ value: m, label: minutesToLabel(m) });
  }
  return out;
};

// Overlap detector (exclusive of self)
const overlapsExisting = (blocks: WorkBlock[], day: number, start: number, end: number, excludeId?: string) => {
  return blocks.some((b) =>
    b.clientId !== excludeId &&
    b.dayOfWeek === day &&
    start < b.endMinutes &&
    b.startMinutes < end
  );
};

// ----------------------------------------------------------------------
export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkBlock | null>(null);
  const [dirty, setDirty] = useState(false);

  const isAllowed = useMemo(() => {
    if (!user) return false;
    return ['ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD',
            'COORDINATOR', 'PLACEMENT_COORDINATOR',
            'TRAINER', 'MENTOR'].includes(user.role);
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/schedule/me');
      const list: WorkBlock[] = (data.blocks || []).map((b: any) => ({
        ...b,
        clientId: b.id || clientId(),
      }));
      setBlocks(list);
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isAllowed) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [user, isAllowed, router, load]);

  const openAdd = (day: number, start: number) => {
    // Default duration 1 hour but clamp inside grid
    const end = Math.min(start + 60, END_MIN);
    const seed: WorkBlock = {
      clientId: clientId(),
      dayOfWeek: day,
      startMinutes: start,
      endMinutes: end,
      blockType: 'ACADEMIC',
      title: '',
      details: '',
      customLabel: '',
    };
    setEditing(seed);
    setModalOpen(true);
  };

  const openEdit = (b: WorkBlock) => {
    setEditing({ ...b });
    setModalOpen(true);
  };

  const upsertBlock = (b: WorkBlock, isNew: boolean) => {
    // Validate
    if (b.endMinutes <= b.startMinutes) {
      toast.error('End must be after start');
      return;
    }
    if (b.startMinutes < START_MIN || b.endMinutes > END_MIN) {
      toast.error('Block must be within 8:00 AM – 6:00 PM');
      return;
    }
    if (b.blockType === 'LUNCH') {
      if (b.startMinutes < LUNCH_WINDOW_START || b.endMinutes > LUNCH_WINDOW_END) {
        toast.error('Lunch must be inside 12:30 – 3:00 PM');
        return;
      }
      if (b.endMinutes - b.startMinutes > LUNCH_MAX) {
        toast.error('Lunch cannot exceed 1 hour');
        return;
      }
      const lunchExists = blocks.some((x) =>
        x.blockType === 'LUNCH' &&
        x.dayOfWeek === b.dayOfWeek &&
        x.clientId !== b.clientId,
      );
      if (lunchExists) {
        toast.error('You already have a lunch block on this day');
        return;
      }
    }
    if (overlapsExisting(blocks, b.dayOfWeek, b.startMinutes, b.endMinutes, b.clientId)) {
      toast.error('This overlaps another block on the same day');
      return;
    }
    if (b.blockType === 'CUSTOM' && !b.customLabel?.trim()) {
      toast.error('Please give the custom block a label');
      return;
    }
    if (!b.title.trim()) {
      toast.error('Please add a title');
      return;
    }

    setBlocks((prev) =>
      isNew
        ? [...prev, b]
        : prev.map((x) => (x.clientId === b.clientId ? b : x)),
    );
    setDirty(true);
    setModalOpen(false);
    setEditing(null);
  };

  const deleteBlock = (b: WorkBlock) => {
    setBlocks((prev) => prev.filter((x) => x.clientId !== b.clientId));
    setDirty(true);
    setModalOpen(false);
    setEditing(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = blocks.map((b) => ({
        dayOfWeek: b.dayOfWeek,
        startMinutes: b.startMinutes,
        endMinutes: b.endMinutes,
        blockType: b.blockType,
        title: b.title,
        details: b.details || null,
        customLabel: b.blockType === 'CUSTOM' ? (b.customLabel || null) : null,
      }));
      const { data } = await apiClient.put('/schedule/me', { blocks: payload });
      const list: WorkBlock[] = (data.blocks || []).map((b: any) => ({
        ...b,
        clientId: b.id,
      }));
      setBlocks(list);
      setDirty(false);
      toast.success('Schedule saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const printMe = () => {
    const url = `/schedule/print?self=1`;
    window.open(url, '_blank');
  };

  const blocksByDay = useMemo(() => {
    const map: Record<number, WorkBlock[]> = {};
    for (let d = 1; d <= 6; d++) map[d] = [];
    for (const b of blocks) map[b.dayOfWeek].push(b);
    for (const d of Object.keys(map)) {
      map[Number(d)].sort((a, b) => a.startMinutes - b.startMinutes);
    }
    return map;
  }, [blocks]);

  if (!user || !isAllowed || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-gray-500">Loading…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">My Weekly Schedule</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Click any empty slot to add a work block. Click a block to edit.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={printMe}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <FiPrinter className="w-4 h-4" /> Print / PDF
            </button>
            {dirty && (
              <button
                onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                title="Discard unsaved changes"
              >
                <FiRotateCcw className="w-4 h-4" /> Discard
              </button>
            )}
            <button
              onClick={save}
              disabled={!dirty || saving}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white ${
                dirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              <FiSave className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.keys(BLOCK_TYPE_META) as BlockType[]).map((k) => (
            <span key={k} className={`text-xs px-2 py-0.5 rounded-full ${BLOCK_TYPE_META[k].chip}`}>
              {BLOCK_TYPE_META[k].label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Day header row */}
            <div className="grid grid-cols-[64px_repeat(6,minmax(0,1fr))] border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="p-2 text-xs text-gray-400 font-medium border-r border-gray-100">Time</div>
              {DAYS.map((d) => (
                <div key={d} className="p-2 text-xs font-semibold text-gray-700 text-center border-r border-gray-100 last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Body: time labels + 6 day columns */}
            <div className="relative grid grid-cols-[64px_repeat(6,minmax(0,1fr))]" style={{ height: TOTAL_SLOTS * SLOT_PX }}>
              {/* Time gutter */}
              <div className="relative border-r border-gray-100">
                {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
                  const m = START_MIN + i * SLOT;
                  const isHour = m % 60 === 0;
                  if (!isHour) return null;
                  return (
                    <div
                      key={i}
                      className="absolute right-1 -mt-2 text-[10px] text-gray-400"
                      style={{ top: i * SLOT_PX }}
                    >
                      {minutesToLabel(m)}
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {DAYS.map((_, colIdx) => {
                const day = colIdx + 1;
                return (
                  <DayColumn
                    key={day}
                    day={day}
                    blocks={blocksByDay[day]}
                    onAdd={openAdd}
                    onEdit={openEdit}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Lunch is only allowed between 12:30 PM and 3:00 PM, and can’t exceed 1 hour.
        </p>

        <AchievementsPanel />
      </div>

      {modalOpen && editing && (
        <BlockModal
          block={editing}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          onSave={(b, isNew) => upsertBlock(b, isNew)}
          onDelete={deleteBlock}
          isNew={!blocks.some((x) => x.clientId === editing.clientId)}
        />
      )}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
function DayColumn({
  day,
  blocks,
  onAdd,
  onEdit,
}: {
  day: number;
  blocks: WorkBlock[];
  onAdd: (day: number, start: number) => void;
  onEdit: (b: WorkBlock) => void;
}) {
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slot = Math.max(0, Math.min(TOTAL_SLOTS - 1, Math.floor(y / SLOT_PX)));
    const startMin = START_MIN + slot * SLOT;
    // Snap DOWN to the nearest empty region — if that slot is inside an
    // existing block, ignore (edit modal opens via block click).
    if (blocks.some((b) => startMin >= b.startMinutes && startMin < b.endMinutes)) return;
    onAdd(day, startMin);
  };

  return (
    <div
      className="relative border-r border-gray-100 last:border-r-0"
      onClick={handleGridClick}
    >
      {/* Row lines every hour */}
      {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => (
        <div
          key={i}
          className={`absolute left-0 right-0 pointer-events-none ${
            i % 4 === 0 ? 'border-t border-gray-200' : 'border-t border-gray-50'
          }`}
          style={{ top: i * SLOT_PX }}
        />
      ))}

      {/* Blocks */}
      {blocks.map((b) => {
        const top = ((b.startMinutes - START_MIN) / SLOT) * SLOT_PX;
        const height = ((b.endMinutes - b.startMinutes) / SLOT) * SLOT_PX;
        const meta = BLOCK_TYPE_META[b.blockType];
        return (
          <button
            key={b.clientId}
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(b); }}
            className={`absolute left-0.5 right-0.5 rounded-md text-left px-1.5 py-1 text-[11px] leading-tight border-l-4 shadow-sm ${meta.block} ${meta.border}`}
            style={{ top, height }}
          >
            <div className="font-semibold truncate">
              {b.blockType === 'CUSTOM' ? (b.customLabel || 'Custom') : meta.label}
            </div>
            <div className="truncate text-gray-700">{b.title || <span className="text-gray-400">Untitled</span>}</div>
            <div className="text-[10px] text-gray-500">
              {minutesToLabel(b.startMinutes)} – {minutesToLabel(b.endMinutes)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
function BlockModal({
  block,
  onSave,
  onDelete,
  onCancel,
  isNew,
}: {
  block: WorkBlock;
  onSave: (b: WorkBlock, isNew: boolean) => void;
  onDelete: (b: WorkBlock) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [b, setB] = useState<WorkBlock>(block);
  const times = useMemo(() => timeChoices(), []);

  useEffect(() => {
    if (b.blockType === 'LUNCH') {
      const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
      const start = clamp(b.startMinutes, LUNCH_WINDOW_START, LUNCH_WINDOW_END - SLOT);
      let end = clamp(b.endMinutes, start + SLOT, LUNCH_WINDOW_END);
      if (end - start > LUNCH_MAX) end = start + LUNCH_MAX;
      if (start !== b.startMinutes || end !== b.endMinutes) {
        setB({ ...b, startMinutes: start, endMinutes: end });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.blockType]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-semibold">
            {isNew ? 'Add block' : 'Edit block'} — {DAYS[b.dayOfWeek - 1]}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-600 font-medium">Block type</label>
            <select
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={b.blockType}
              onChange={(e) => setB({ ...b, blockType: e.target.value as BlockType })}
            >
              <option value="ACADEMIC">Academic</option>
              <option value="ADMINISTRATIVE">Administrative</option>
              <option value="RESEARCH">Research</option>
              <option value="MENTOR_MENTEE">Mentor–Mentee Interaction</option>
              <option value="LUNCH">Lunch</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {b.blockType === 'CUSTOM' && (
            <div>
              <label className="text-xs text-gray-600 font-medium">Custom label</label>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={b.customLabel || ''}
                onChange={(e) => setB({ ...b, customLabel: e.target.value })}
                placeholder="e.g. Consulting hour"
                maxLength={120}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-600 font-medium">Title / what you'll do</label>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={b.title}
              onChange={(e) => setB({ ...b, title: e.target.value })}
              placeholder="e.g. B.Tech CSE-3 lecture"
              maxLength={250}
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 font-medium">Details</label>
            <textarea
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={b.details || ''}
              onChange={(e) => setB({ ...b, details: e.target.value })}
              placeholder="Add anything useful (room, batch, agenda)"
              maxLength={4000}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 font-medium">Start</label>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={b.startMinutes}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setB({ ...b, startMinutes: s, endMinutes: Math.max(s + SLOT, b.endMinutes) });
                }}
              >
                {times.slice(0, -1).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium">End</label>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={b.endMinutes}
                onChange={(e) => setB({ ...b, endMinutes: Number(e.target.value) })}
              >
                {times.filter((t) => t.value > b.startMinutes).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {b.blockType === 'LUNCH' && (
            <p className="text-[11px] text-rose-700 bg-rose-50 rounded-md px-2 py-1.5">
              Lunch window: 12:30 PM – 3:00 PM • max 1 hour
            </p>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 rounded-b-xl">
          {!isNew ? (
            <button
              onClick={() => onDelete(b)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 rounded-lg"
            >
              <FiTrash2 className="w-4 h-4" /> Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onSave(b, isNew)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <FiPlus className="w-4 h-4" /> {isNew ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Extra Achievements: self-contained CRUD panel below the grid.
interface Achievement {
  id: string;
  title: string;
  category?: string | null;
  description?: string | null;
  achievedOn?: string | null;
}

function AchievementsPanel() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Achievement> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/schedule/achievements/me');
      setItems(data.achievements || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: editing.title,
        category: editing.category || null,
        description: editing.description || null,
        achievedOn: editing.achievedOn || null,
      };
      if (editing.id) {
        await apiClient.patch(`/schedule/achievements/${editing.id}`, payload);
        toast.success('Updated');
      } else {
        await apiClient.post('/schedule/achievements/me', payload);
        toast.success('Added');
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this achievement?')) return;
    try {
      await apiClient.delete(`/schedule/achievements/${id}`);
      toast.success('Deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const fmtDate = (s?: string | null) => {
    if (!s) return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiAward className="w-5 h-5 text-amber-500" /> Extra Achievements
          </h2>
          <p className="text-xs text-gray-500">
            Publications, awards, workshops, certifications, patents — anything worth noting.
          </p>
        </div>
        <button
          onClick={() => setEditing({ title: '', category: '', description: '', achievedOn: '' })}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white bg-amber-600 hover:bg-amber-700"
        >
          <FiPlus className="w-4 h-4" /> Add achievement
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 text-center">
            No achievements yet. Add your first one above.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((a) => (
              <li key={a.id} className="p-3 flex items-start gap-3">
                <div className="mt-0.5 text-amber-500"><FiAward className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-gray-900">{a.title}</span>
                    {a.category && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {a.category}
                      </span>
                    )}
                    {a.achievedOn && (
                      <span className="text-xs text-gray-500">{fmtDate(a.achievedOn)}</span>
                    )}
                  </div>
                  {a.description && (
                    <div className="text-sm text-gray-600 mt-0.5 whitespace-pre-line">{a.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing({ ...a })}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-base font-semibold">
                {editing.id ? 'Edit achievement' : 'Add achievement'}
              </h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium">Title</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Best paper award — IEEE Access 2026"
                  maxLength={250}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">Category</label>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editing.category || ''}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  placeholder="e.g. Publication, Award, Workshop, Patent, Certification"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">Date</label>
                <input
                  type="date"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editing.achievedOn || ''}
                  onChange={(e) => setEditing({ ...editing, achievedOn: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">Description</label>
                <textarea
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={4}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Optional details (venue, co-authors, link, etc.)"
                  maxLength={4000}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-60"
              >
                <FiSave className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
