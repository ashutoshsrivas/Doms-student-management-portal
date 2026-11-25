// Department pages: the umbrella's shape, shared by the curator's screen and
// the public page.

export type DepartmentCategory = { key: string; label: string };

// Mirrors DEPARTMENT_CATEGORIES on the server. Sent with every response as
// well, so a category added there appears here without a deploy — this copy
// is only what the screen falls back to while the request is in flight.
export const DEPARTMENT_CATEGORIES: DepartmentCategory[] = [
  { key: 'faculty', label: 'Faculty' },
  { key: 'projects', label: 'Projects' },
  { key: 'students', label: 'Students' },
  { key: 'alumni', label: 'Alumni' },
  { key: 'domain_research', label: 'Domain Research' },
  { key: 'software', label: 'Software' },
  { key: 'preparedness', label: 'Preparedness' },
  { key: 'profiling', label: 'Profiling' },
  { key: 'certification', label: 'Certification' },
  { key: 'placement', label: 'Placement' },
  { key: 'sips', label: 'SIPs' },
  { key: 'live_projects', label: 'Live Projects' },
  { key: 'simulations', label: 'Simulations' },
  { key: 'foreign_collaborations', label: 'Foreign Collaborations' },
];

export type DepartmentEntry = {
  id: string;
  departmentId: string;
  category: string;
  title: string;
  details: string;
  fileUrl: string | null;
  fileName: string | null;
  fileKind: 'image' | 'document' | null;
  linkUrl: string | null;
  isHidden: boolean;
  position: number;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Department = {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  chairHeadId: string | null;
  chairHeadName: string;
  chairHeadEmail: string;
  isHidden: boolean;
  position: number;
  updatedAt?: string;
  entryCount?: number;
  counts?: { total: number; hidden: number };
};

export type EntriesByCategory = Record<string, DepartmentEntry[]>;

export const labelOf = (categories: DepartmentCategory[], key: string) =>
  categories.find((c) => c.key === key)?.label || key.replace(/_/g, ' ');

// A file the reader is about to open: say which kind it is, in a word.
export const fileLabel = (entry: DepartmentEntry) => {
  if (!entry.fileUrl) return '';
  if (entry.fileKind === 'image') return 'Picture';
  const name = entry.fileName || '';
  const ext = name.includes('.') ? name.split('.').pop()!.toUpperCase() : '';
  return ext || 'Document';
};

export const ACCEPT_ANY = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.txt',
].join(',');

export const ACCEPT_IMAGE = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';
