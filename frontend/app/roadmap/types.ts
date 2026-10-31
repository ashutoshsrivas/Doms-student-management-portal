export type Question = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'choice';
  options?: string[];
  required?: boolean;
};

export type Goal = {
  id?: string;
  title: string;
  answers: Record<string, string>;
  targetDate: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionNote?: string;
  approvedByName?: string;
  approvedAt?: string | null;
  createdAt?: string;
};

export type Milestone = {
  id: string;
  academicSessionId?: string;
  title: string;
  description: string;
  dueDate: string;
  icon: string;
  questions: Question[];
  createdByName?: string;
  createdBy?: string;
  sessionName?: string;
  responseCount?: number;
  canEdit?: boolean;
  myResponse?: { id: string; answers: Record<string, string>; submittedAt: string } | null;
};

export type SelfMilestone = {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'MILESTONE' | 'ACHIEVEMENT';
  createdAt?: string;
};

export type SessionInfo = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  sectionName?: string;
  isActive?: boolean;
};

export type Roadmap = {
  session: SessionInfo | null;
  questions: Question[];
  goal: Goal | null;
  milestones: Milestone[];
  selfMilestones: SelfMilestone[];
  student?: { id: string; name: string; email: string; registrationNumber: string } | null;
};

// Whole days between today and a date. Negative once the date has passed —
// the roadmap shows those as a negative count on purpose.
export const daysUntil = (date: string | null | undefined): number | null => {
  if (!date) return null;
  const target = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export const fmtDate = (date: string | null | undefined) => {
  if (!date) return '—';
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const MILESTONE_ICONS = ['target', 'flag', 'book', 'award', 'briefcase', 'users', 'calendar', 'star', 'zap', 'check'] as const;
