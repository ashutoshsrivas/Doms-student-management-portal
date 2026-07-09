'use client';

// Printable page. Modes:
//   ?self=1                → current user's schedule
//   ?userId=<id>           → single other user (admin/HOD only)
//   ?all=1                 → every non-student user, one per printed page
// Renders a clean grid then auto-triggers window.print() so the user can
// Save-as-PDF.

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/app/lib/apiClient';
import useAuthStore from '@/app/store/authStore';

const START_MIN = 8 * 60;
const END_MIN = 18 * 60;
const SLOT = 15;
const TOTAL_SLOTS = (END_MIN - START_MIN) / SLOT;
const SLOT_PX = 18;                     // slightly tighter for print
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type BlockType = 'ACADEMIC' | 'ADMINISTRATIVE' | 'RESEARCH' | 'MENTOR_MENTEE' | 'LUNCH' | 'CUSTOM';

interface Block {
  id: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  blockType: BlockType;
  title: string;
  details?: string | null;
  customLabel?: string | null;
}

interface UserMeta {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  approvedRole: string;
  department?: string | null;
  employeeId?: string | null;
}

interface Schedule {
  user: UserMeta;
  blocks: Block[];
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', HOD: 'HOD', FACULTY: 'Faculty',
  CHAIR_HEAD: 'Chair Head', COORDINATOR: 'Coordinator',
  PLACEMENT_COORDINATOR: 'Placement Coordinator',
  TRAINER: 'Trainer', MENTOR: 'Mentor',
};

const BLOCK_META: Record<BlockType, { label: string; fill: string; border: string }> = {
  ACADEMIC:       { label: 'Academic',       fill: '#e0edff', border: '#4a86e8' },
  ADMINISTRATIVE: { label: 'Administrative', fill: '#efe0ff', border: '#8e63c9' },
  RESEARCH:       { label: 'Research',       fill: '#dff5e5', border: '#3aa562' },
  MENTOR_MENTEE:  { label: 'Mentor–Mentee',  fill: '#fff2d1', border: '#c98b12' },
  LUNCH:          { label: 'Lunch',          fill: '#ffe1e6', border: '#c73f5b' },
  CUSTOM:         { label: 'Custom',         fill: '#eeeeee', border: '#666666' },
};

const minutesToLabel = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
};

export default function PrintSchedulePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading…</div>}>
      <PrintScheduleInner />
    </Suspense>
  );
}

function PrintScheduleInner() {
  const params = useSearchParams();
  const { user: authedUser } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mode = useMemo(() => {
    if (params.get('all') === '1') return 'all';
    if (params.get('userId')) return 'user';
    return 'self';
  }, [params]);

  useEffect(() => {
    (async () => {
      try {
        if (mode === 'all') {
          const { data } = await apiClient.get('/schedule/all');
          setSchedules(data.schedules || []);
        } else if (mode === 'user') {
          const userId = params.get('userId');
          const { data } = await apiClient.get(`/schedule/user/${userId}`);
          setSchedules([{ user: data.user, blocks: data.blocks || [] }]);
        } else {
          const myBlocks = await apiClient.get('/schedule/me');
          const u: any = authedUser;
          setSchedules([{
            user: u ? {
              id: u.id, firstName: u.firstName, lastName: u.lastName,
              email: u.email, approvedRole: u.approvedRole || u.role,
              department: u.department, employeeId: u.employeeId,
            } : {
              id: '', firstName: 'My', lastName: 'Schedule',
              email: '', approvedRole: '',
            },
            blocks: myBlocks.data.blocks || [],
          }]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load');
      }
    })();
  }, [mode, params, authedUser]);

  // Fire print once content is on screen
  useEffect(() => {
    if (!schedules) return;
    const t = setTimeout(() => {
      try { window.print(); } catch { /* ignored */ }
    }, 400);
    return () => clearTimeout(t);
  }, [schedules]);

  if (error) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#a00' }}>Error: {error}</div>;
  }
  if (!schedules) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading…</div>;
  }

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        html, body { background: #fff; margin: 0; padding: 0; }
        .sched-page { page-break-after: always; padding: 8px 4px; font-family: -apple-system, system-ui, sans-serif; }
        .sched-page:last-child { page-break-after: auto; }
        @media screen {
          body { background: #f3f4f6; }
          .sched-page { max-width: 1100px; margin: 16px auto; background: #fff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08); border-radius: 6px; padding: 16px; }
          .noprint { display: block; }
        }
        @media print {
          .noprint { display: none !important; }
        }
        .toolbar {
          max-width: 1100px; margin: 12px auto 0; display: flex; justify-content: flex-end; gap: 8px;
        }
        .toolbar button {
          padding: 6px 12px; font-size: 13px; border: 1px solid #cbd5e1;
          background: #fff; border-radius: 6px; cursor: pointer;
        }
        .toolbar button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      `}</style>

      <div className="noprint toolbar">
        <button onClick={() => window.print()} className="primary">Save as PDF / Print</button>
        <button onClick={() => window.close()}>Close</button>
      </div>

      {schedules.map((s) => (
        <SchedulePrintCard key={s.user.id || Math.random()} schedule={s} />
      ))}
    </>
  );
}

function SchedulePrintCard({ schedule }: { schedule: Schedule }) {
  const { user, blocks } = schedule;
  const byDay: Record<number, Block[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const b of blocks) byDay[b.dayOfWeek]?.push(b);

  return (
    <div className="sched-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
            {user.firstName} {user.lastName || ''}
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            {ROLE_LABEL[user.approvedRole] || user.approvedRole}
            {user.department ? ` • ${user.department}` : ''}
            {user.employeeId ? ` • ID ${user.employeeId}` : ''}
            {user.email ? ` • ${user.email}` : ''}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#777' }}>
          Weekly Schedule (8:00 AM – 6:00 PM)
        </div>
      </div>

      {/* Grid */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(6, 1fr)', background: '#f3f4f6', borderBottom: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: 10, color: '#666', padding: '4px 6px' }}>Time</div>
          {DAYS.map((d) => (
            <div key={d} style={{ fontSize: 11, fontWeight: 600, color: '#222', padding: '4px 6px', borderLeft: '1px solid #e5e7eb' }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '52px repeat(6, 1fr)', height: TOTAL_SLOTS * SLOT_PX }}>
          {/* Time gutter */}
          <div style={{ position: 'relative', borderRight: '1px solid #e5e7eb' }}>
            {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => {
              const m = START_MIN + i * SLOT;
              if (m % 60 !== 0) return null;
              return (
                <div key={i} style={{ position: 'absolute', top: i * SLOT_PX - 6, right: 4, fontSize: 9, color: '#666' }}>
                  {minutesToLabel(m)}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {DAYS.map((_, colIdx) => {
            const day = colIdx + 1;
            const dayBlocks = byDay[day] || [];
            return (
              <div key={day} style={{ position: 'relative', borderLeft: '1px solid #e5e7eb' }}>
                {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', left: 0, right: 0, top: i * SLOT_PX,
                      borderTop: i % 4 === 0 ? '1px solid #d1d5db' : '1px dashed #f0f0f0',
                    }}
                  />
                ))}
                {dayBlocks.map((b) => {
                  const top = ((b.startMinutes - START_MIN) / SLOT) * SLOT_PX;
                  const height = ((b.endMinutes - b.startMinutes) / SLOT) * SLOT_PX;
                  const meta = BLOCK_META[b.blockType];
                  return (
                    <div
                      key={b.id}
                      style={{
                        position: 'absolute', left: 2, right: 2, top, height,
                        background: meta.fill, borderLeft: `3px solid ${meta.border}`,
                        borderRadius: 3, padding: '2px 4px',
                        fontSize: 9, lineHeight: 1.15, overflow: 'hidden',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#111' }}>
                        {b.blockType === 'CUSTOM' ? (b.customLabel || 'Custom') : meta.label}
                      </div>
                      <div style={{ color: '#222' }}>{b.title || '—'}</div>
                      <div style={{ color: '#666', fontSize: 8 }}>
                        {minutesToLabel(b.startMinutes)}–{minutesToLabel(b.endMinutes)}
                      </div>
                      {b.details ? (
                        <div style={{ color: '#333', fontSize: 8, marginTop: 1 }}>{b.details}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
