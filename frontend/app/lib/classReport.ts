// The class attendance report: one workbook holding every daily punch, a
// per-class summary, and a note of what the file covers.
//
// It is the record an administrator keeps — and the thing to download before
// clearing a term's classes, since nothing in the portal brings those back.

import * as XLSX from 'xlsx';

export type ReportClass = {
  id: string;
  name: string;
  description: string;
  session: string;
  coordinator: string;
  coordinatorEmail: string;
  representatives: string[];
  totalStrength: number | null;
  nocCount: number | null;
  status: string;
  createdAt: string;
};

export type ReportAttendance = {
  classId: string;
  className: string;
  session: string;
  coordinator: string;
  date: string;
  classTiming: string;
  totalStrength: number | null;
  presentCount: number;
  absentCount: number;
  bunkedCount: number;
  leaveCount: number;
  additionalInfo: string;
  submittedBy: string;
  submittedAt: string;
  actionTakenReport: string;
  atrBy: string;
  atrAt: string | null;
};

export type ClassReport = {
  generatedAt: string;
  scope: { sessionId: string | null; sessionName: string | null; from: string | null; to: string | null };
  classes: ReportClass[];
  attendance: ReportAttendance[];
};

const stamp = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Present against the class strength, which is the number anyone reading the
// report actually wants. Blank rather than zero when the strength is unknown,
// because a made-up denominator is worse than an empty cell.
const pct = (present: number, strength: number | null) =>
  strength && strength > 0 ? Math.round((present / strength) * 1000) / 10 : '';

const ATTENDANCE_HEADER = [
  'Session', 'Class', 'Coordinator', 'Date', 'Class timing', 'Total strength',
  'Present', 'Absent', 'Bunked', 'Leave', 'Present %', 'Note',
  'Submitted by', 'Submitted at', 'Action taken report', 'ATR by', 'ATR at',
];

const SUMMARY_HEADER = [
  'Session', 'Class', 'Coordinator', 'Coordinator email', 'Class representatives',
  'Total strength', 'NOC', 'Status', 'Entries', 'First entry', 'Last entry',
  'Avg present', 'Avg present %', 'Total absent', 'Total bunked', 'Total leave',
  'Entries with an ATR',
];

function attendanceSheet(report: ClassReport) {
  const rows = report.attendance.map((a) => [
    a.session, a.className, a.coordinator, a.date, a.classTiming,
    a.totalStrength ?? '', a.presentCount, a.absentCount, a.bunkedCount, a.leaveCount,
    pct(a.presentCount, a.totalStrength), a.additionalInfo,
    a.submittedBy, stamp(a.submittedAt), a.actionTakenReport, a.atrBy, stamp(a.atrAt),
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([ATTENDANCE_HEADER, ...rows]);
  sheet['!cols'] = [
    { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 13 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 30 },
    { wch: 20 }, { wch: 17 }, { wch: 40 }, { wch: 18 }, { wch: 17 },
  ];
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  return sheet;
}

function summarySheet(report: ClassReport) {
  const byClass = new Map<string, ReportAttendance[]>();
  for (const a of report.attendance) {
    if (!byClass.has(a.classId)) byClass.set(a.classId, []);
    byClass.get(a.classId)!.push(a);
  }
  const rows = report.classes.map((c) => {
    const list = byClass.get(c.id) || [];
    const dates = list.map((a) => a.date).sort();
    const sum = (pick: (a: ReportAttendance) => number) => list.reduce((n, a) => n + pick(a), 0);
    const avgPresent = list.length ? Math.round((sum((a) => a.presentCount) / list.length) * 10) / 10 : '';
    return [
      c.session, c.name, c.coordinator, c.coordinatorEmail, c.representatives.join(', '),
      c.totalStrength ?? '', c.nocCount ?? '', c.status, list.length,
      dates[0] || '', dates[dates.length - 1] || '',
      avgPresent,
      typeof avgPresent === 'number' ? pct(avgPresent, c.totalStrength) : '',
      sum((a) => a.absentCount), sum((a) => a.bunkedCount), sum((a) => a.leaveCount),
      list.filter((a) => a.actionTakenReport).length,
    ];
  });
  const sheet = XLSX.utils.aoa_to_sheet([SUMMARY_HEADER, ...rows]);
  sheet['!cols'] = [
    { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 26 }, { wch: 34 },
    { wch: 13 }, { wch: 7 }, { wch: 10 }, { wch: 9 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 18 },
  ];
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  return sheet;
}

// What this file covers, written inside it. A download kept as an archive is
// worth nothing if nobody can tell later which classes and dates it holds.
function coverSheet(report: ClassReport) {
  const rows = [
    ['DOMS — class attendance report'],
    [],
    ['Generated', stamp(report.generatedAt)],
    ['Session', report.scope.sessionName || 'Every session'],
    ['From', report.scope.from || 'The first entry recorded'],
    ['To', report.scope.to || 'The last entry recorded'],
    ['Classes', report.classes.length],
    ['Attendance entries', report.attendance.length],
    [],
    ['Sheets'],
    ['Daily attendance', 'One row per punch: class, date, timing, counts, note and ATR.'],
    ['Class summary', 'One row per class: totals and averages over the range above.'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 22 }, { wch: 64 }];
  return sheet;
}

export const reportFileName = (report: ClassReport) => {
  const scope = (report.scope.sessionName || 'all-sessions')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'classes';
  const range = report.scope.from || report.scope.to
    ? `-${report.scope.from || 'start'}_${report.scope.to || 'end'}`
    : '';
  return `class-attendance-${scope}${range}-${stamp(report.generatedAt).slice(0, 10)}.xlsx`;
};

export function downloadClassReport(report: ClassReport, filename?: string) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, coverSheet(report), 'Report');
  XLSX.utils.book_append_sheet(book, attendanceSheet(report), 'Daily attendance');
  XLSX.utils.book_append_sheet(book, summarySheet(report), 'Class summary');
  XLSX.writeFile(book, filename || reportFileName(report));
}
