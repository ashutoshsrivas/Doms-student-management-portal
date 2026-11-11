// Shared between the form builder, the report and the public fill page.

export type FieldType =
  | 'short_text' | 'long_text' | 'number' | 'email' | 'phone' | 'date'
  | 'single_choice' | 'multi_choice' | 'dropdown' | 'file';

// ---------------------------------------------------------------------------
// Rich text
//
// Formatted text is a span tree, never HTML — see the backend's
// utils/formRichText.js. The fill page turns this into React elements, so a
// form cannot carry markup (or a script) into a responder's browser.
// ---------------------------------------------------------------------------
export type RichSpan = {
  text: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  color?: string;
};
export type RichLine = { spans: RichSpan[] };
export type Rich = RichLine[];

// The colours the editor offers. The first is the default and is never stored.
export const RICH_COLORS = [
  '#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
  '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#6b7280',
];

export const richToText = (rich: Rich | undefined | null): string =>
  (rich || []).map((l) => (l.spans || []).map((s) => s.text).join('')).join('\n');

export const textToRich = (text: string): Rich =>
  String(text ?? '').split('\n').map((line) => ({ spans: line ? [{ text: line }] : [] }));

export type Media = { kind: 'image' | 'video'; url: string; name?: string };

export type FormOption = {
  label: string;
  rich?: Rich;
  media?: Media;
};

// The answer to a file question: the stored upload, not the file itself.
export type FileAnswer = {
  url: string;
  name: string;
  size?: number | null;
  type?: string | null;
};

export type AnswerValue = string | string[] | FileAnswer;

export const isFileAnswer = (v: AnswerValue | undefined): v is FileAnswer =>
  !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as FileAnswer).url === 'string';

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  labelRich?: Rich;
  helpRich?: Rich;
  media?: Media;
  options?: (FormOption | string)[];
  // file questions only
  accept?: 'image' | 'document' | 'any';
  maxSizeMb?: number;
};

// Options were plain strings before they could carry formatting and pictures,
// and a bulk import still writes them that way, so every read goes through here.
export const normalizeOptions = (field: Pick<FormField, 'options'>): FormOption[] =>
  (field.options || [])
    .map((o) => (typeof o === 'string' ? { label: o } : o))
    .filter((o): o is FormOption => !!o && typeof o.label === 'string' && !!o.label.trim())
    .map((o) => ({ ...o, label: o.label.trim() }));

export type ThemeName =
  | 'indigo' | 'emerald' | 'ocean' | 'rose' | 'amber' | 'violet' | 'slate' | 'night';

export type Theme = {
  label: string;
  swatch: string;
  page: string;
  card: string;
  bar: string;
  heading: string;
  body: string;
  muted: string;
  field: string;
  option: string;
  button: string;
  dark?: boolean;
};

// Each preset dresses the fill page. Written out as literal class strings so
// Tailwind sees every one of them when it scans the source.
export const THEMES: Record<ThemeName, Theme> = {
  indigo: {
    label: 'Indigo',
    swatch: 'bg-gradient-to-br from-indigo-600 to-fuchsia-600',
    page: 'bg-gradient-to-b from-slate-50 to-slate-100',
    card: 'border-gray-200 bg-white',
    bar: 'bg-gradient-to-r from-indigo-600 to-fuchsia-600',
    heading: 'text-gray-900',
    body: 'text-gray-700',
    muted: 'text-gray-500',
    field: 'border-gray-200 bg-white text-gray-900 focus:border-indigo-400 focus:ring-indigo-100',
    option: 'border-gray-200 hover:bg-gray-50 has-checked:border-indigo-300 has-checked:bg-indigo-50/60',
    button: 'bg-gray-900 text-white hover:bg-gray-800',
  },
  emerald: {
    label: 'Emerald',
    swatch: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    page: 'bg-gradient-to-b from-emerald-50 to-teal-50',
    card: 'border-emerald-100 bg-white',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    heading: 'text-emerald-950',
    body: 'text-emerald-900',
    muted: 'text-emerald-700/70',
    field: 'border-emerald-200 bg-white text-emerald-950 focus:border-emerald-400 focus:ring-emerald-100',
    option: 'border-emerald-200 hover:bg-emerald-50 has-checked:border-emerald-400 has-checked:bg-emerald-50',
    button: 'bg-emerald-700 text-white hover:bg-emerald-800',
  },
  ocean: {
    label: 'Ocean',
    swatch: 'bg-gradient-to-br from-sky-500 to-blue-700',
    page: 'bg-gradient-to-b from-sky-50 to-blue-50',
    card: 'border-sky-100 bg-white',
    bar: 'bg-gradient-to-r from-sky-500 to-blue-700',
    heading: 'text-slate-900',
    body: 'text-slate-700',
    muted: 'text-sky-700/70',
    field: 'border-sky-200 bg-white text-slate-900 focus:border-sky-400 focus:ring-sky-100',
    option: 'border-sky-200 hover:bg-sky-50 has-checked:border-sky-400 has-checked:bg-sky-50',
    button: 'bg-blue-700 text-white hover:bg-blue-800',
  },
  rose: {
    label: 'Rose',
    swatch: 'bg-gradient-to-br from-rose-500 to-pink-600',
    page: 'bg-gradient-to-b from-rose-50 to-pink-50',
    card: 'border-rose-100 bg-white',
    bar: 'bg-gradient-to-r from-rose-500 to-pink-600',
    heading: 'text-rose-950',
    body: 'text-rose-900',
    muted: 'text-rose-700/70',
    field: 'border-rose-200 bg-white text-rose-950 focus:border-rose-400 focus:ring-rose-100',
    option: 'border-rose-200 hover:bg-rose-50 has-checked:border-rose-400 has-checked:bg-rose-50',
    button: 'bg-rose-700 text-white hover:bg-rose-800',
  },
  amber: {
    label: 'Amber',
    swatch: 'bg-gradient-to-br from-amber-400 to-orange-600',
    page: 'bg-gradient-to-b from-amber-50 to-orange-50',
    card: 'border-amber-100 bg-white',
    bar: 'bg-gradient-to-r from-amber-400 to-orange-600',
    heading: 'text-amber-950',
    body: 'text-amber-900',
    muted: 'text-amber-800/70',
    field: 'border-amber-200 bg-white text-amber-950 focus:border-amber-400 focus:ring-amber-100',
    option: 'border-amber-200 hover:bg-amber-50 has-checked:border-amber-500 has-checked:bg-amber-50',
    button: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  violet: {
    label: 'Violet',
    swatch: 'bg-gradient-to-br from-violet-500 to-purple-700',
    page: 'bg-gradient-to-b from-violet-50 to-purple-50',
    card: 'border-violet-100 bg-white',
    bar: 'bg-gradient-to-r from-violet-500 to-purple-700',
    heading: 'text-violet-950',
    body: 'text-violet-900',
    muted: 'text-violet-700/70',
    field: 'border-violet-200 bg-white text-violet-950 focus:border-violet-400 focus:ring-violet-100',
    option: 'border-violet-200 hover:bg-violet-50 has-checked:border-violet-400 has-checked:bg-violet-50',
    button: 'bg-violet-700 text-white hover:bg-violet-800',
  },
  slate: {
    label: 'Plain',
    swatch: 'bg-gradient-to-br from-slate-400 to-slate-700',
    page: 'bg-slate-100',
    card: 'border-slate-200 bg-white',
    bar: 'bg-slate-700',
    heading: 'text-slate-900',
    body: 'text-slate-700',
    muted: 'text-slate-500',
    field: 'border-slate-300 bg-white text-slate-900 focus:border-slate-500 focus:ring-slate-200',
    option: 'border-slate-200 hover:bg-slate-50 has-checked:border-slate-500 has-checked:bg-slate-100',
    button: 'bg-slate-800 text-white hover:bg-slate-900',
  },
  night: {
    label: 'Night',
    swatch: 'bg-gradient-to-br from-slate-800 to-indigo-900',
    page: 'bg-gradient-to-b from-slate-900 to-slate-950',
    card: 'border-white/10 bg-white/5',
    bar: 'bg-gradient-to-r from-indigo-500 to-fuchsia-500',
    heading: 'text-white',
    body: 'text-slate-200',
    muted: 'text-slate-400',
    field: 'border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-indigo-500/30',
    option: 'border-white/10 hover:bg-white/5 has-checked:border-indigo-400 has-checked:bg-indigo-500/15',
    button: 'bg-indigo-500 text-white hover:bg-indigo-400',
    dark: true,
  },
};

export const themeOf = (name: string | null | undefined): Theme =>
  THEMES[(name || 'indigo') as ThemeName] || THEMES.indigo;

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
  headerImageUrl: string | null;
  theme: ThemeName;
  requireQrToken: boolean;
  qrWindowSeconds: number;
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
  answers: Record<string, AnswerValue>;
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
  file: 'File upload',
};

export const CHOICE_TYPES: FieldType[] = ['single_choice', 'multi_choice', 'dropdown'];
export const isChoice = (t: FieldType) => CHOICE_TYPES.includes(t);

export const FILE_ACCEPT_LABELS = {
  image: 'Pictures only',
  document: 'Documents only',
  any: 'Pictures or documents',
} as const;

// What to put in the file picker's accept attribute, so the phone offers the
// right chooser instead of everything on the device.
export const FILE_ACCEPT_ATTR = {
  image: 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf',
  any: 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip',
} as const;

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

export const fmtBytes = (bytes: number | null | undefined) => {
  if (!Number.isFinite(Number(bytes))) return '';
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const BAND_STYLES = {
  GREEN: { chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500', row: 'bg-emerald-50/40', label: 'Within 50 m' },
  YELLOW: { chip: 'bg-amber-100 text-amber-800 ring-amber-200', dot: 'bg-amber-500', row: 'bg-amber-50/50', label: 'Within 200 m' },
  RED: { chip: 'bg-rose-100 text-rose-800 ring-rose-200', dot: 'bg-rose-500', row: 'bg-rose-50/50', label: 'Over 200 m' },
} as const;
