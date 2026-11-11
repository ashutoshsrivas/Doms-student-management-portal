// Shared between the form builder, the report and the public fill page.

export type FieldType =
  | 'short_text' | 'long_text' | 'number' | 'email' | 'phone' | 'date'
  | 'single_choice' | 'multi_choice' | 'dropdown';

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
};

export type FormSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  audience: 'PUBLIC' | 'PRIVATE';
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  fields: FormField[];
  collectLocation: boolean;
  collectDevice: boolean;
  locationRequired: boolean;
  oneResponsePerUser: boolean;
  securityPoint: { latitude: number; longitude: number; label: string; setAt: string } | null;
  publishedAt: string | null;
  closesAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByName: string;
  responseCount?: number;
};

export type ResponseRow = {
  id: string;
  index: number;
  submittedAt: string;
  userId: string | null;
  name: string;
  email: string;
  registrationNumber: string;
  session: string;
  answers: Record<string, string | string[]>;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  locationStatus: 'GRANTED' | 'DENIED' | 'UNAVAILABLE' | 'NOT_ASKED';
  deviceFingerprint: string | null;
  deviceLabel: string;
  deviceDetails: Record<string, string | number | null> | null;
  deviceStatus: 'GRANTED' | 'DENIED' | 'NOT_ASKED';
  ipAddress: string;
  repeatedDevice: boolean;
  deviceUseCount: number;
  distanceMetres: number | null;
  band: 'GREEN' | 'YELLOW' | 'RED' | null;
};

export type FieldStat = {
  id: string;
  label: string;
  type: FieldType;
  answered: number;
  options?: { label: string; count: number }[];
  numeric?: { min: number; max: number; average: number };
};

export type ReportStats = {
  total: number;
  withLocation: number;
  locationDenied: number;
  locationUnavailable: number;
  uniqueDevices: number;
  deviceDenied: number;
  repeatedDeviceResponses: number;
  firstAt: string | null;
  lastAt: string | null;
  bands: { green: number; yellow: number; red: number; unmeasured: number } | null;
  fields: FieldStat[];
  repeatedDevices: { fingerprint: string; count: number; label: string; respondents: string[] }[];
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Short answer',
  long_text: 'Paragraph',
  number: 'Number',
  email: 'Email',
  phone: 'Phone',
  date: 'Date',
  single_choice: 'Multiple choice (one)',
  multi_choice: 'Checkboxes (many)',
  dropdown: 'Dropdown',
};

export const CHOICE_TYPES: FieldType[] = ['single_choice', 'multi_choice', 'dropdown'];
export const isChoice = (t: FieldType) => CHOICE_TYPES.includes(t);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formatted by hand, not with toLocaleDateString: the server and the browser
// can sit in different locales, and the mismatch breaks hydration.
export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Metres, written the way a person reads them.
export const fmtDistance = (m: number | null) => {
  if (m === null) return '—';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
};

export const BAND_STYLES = {
  GREEN: { chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500', row: 'bg-emerald-50/40', label: 'Within 50 m' },
  YELLOW: { chip: 'bg-amber-100 text-amber-800 ring-amber-200', dot: 'bg-amber-500', row: 'bg-amber-50/50', label: 'Within 200 m' },
  RED: { chip: 'bg-rose-100 text-rose-800 ring-rose-200', dot: 'bg-rose-500', row: 'bg-rose-50/50', label: 'Over 200 m' },
} as const;
