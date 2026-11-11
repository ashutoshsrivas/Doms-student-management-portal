// The bulk question sheet: download a template, fill it in a spreadsheet,
// upload it back.
//
// Questions imported this way arrive as plain text. Formatting, pictures and
// file limits are added afterwards in the builder — a spreadsheet cell is the
// wrong place to describe any of that.

import * as XLSX from 'xlsx';
import { FieldType, FormField, FIELD_TYPE_LABELS } from './forms';

const TYPE_KEYS = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

const HEADER = ['Question', 'Type', 'Required', 'Help text', 'Options (separate with |)'];

const EXAMPLES: (string | number)[][] = [
  ['What is your name?', 'short_text', 'yes', '', ''],
  ['Which programme are you in?', 'single_choice', 'yes', 'Pick one', 'BBA|MBA|B.Com'],
  ['Which sessions did you attend?', 'multi_choice', 'no', 'Tick all that apply', 'Day 1|Day 2|Day 3'],
  ['Tell us what could be better', 'long_text', 'no', '', ''],
  ['Upload your certificate', 'file', 'no', 'PDF or a photo', ''],
];

// A second sheet listing what each Type means, so nobody has to guess.
const typeSheet = () => [
  ['Type', 'What the responder sees'],
  ...TYPE_KEYS.map((key) => [key, FIELD_TYPE_LABELS[key]]),
];

export function downloadQuestionTemplate(filename = 'form-questions-template.xlsx') {
  const book = XLSX.utils.book_new();

  const questions = XLSX.utils.aoa_to_sheet([HEADER, ...EXAMPLES]);
  questions['!cols'] = [{ wch: 46 }, { wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 46 }];
  XLSX.utils.book_append_sheet(book, questions, 'Questions');

  const types = XLSX.utils.aoa_to_sheet(typeSheet());
  types['!cols'] = [{ wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(book, types, 'Types');

  XLSX.writeFile(book, filename);
}

const YES = new Set(['yes', 'y', 'true', '1', 'required', 'mandatory']);

// Accepts either the key (short_text) or the label a person would type
// (Short answer), and falls back to a short answer rather than refusing.
function parseType(raw: string): FieldType {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return 'short_text';
  const byKey = TYPE_KEYS.find((k) => k === value.replace(/[\s-]+/g, '_'));
  if (byKey) return byKey;
  const byLabel = TYPE_KEYS.find((k) => FIELD_TYPE_LABELS[k].toLowerCase() === value);
  if (byLabel) return byLabel;
  if (value.startsWith('check')) return 'multi_choice';
  if (value.startsWith('radio') || value.startsWith('mcq') || value.startsWith('multiple choice')) return 'single_choice';
  if (value.startsWith('drop') || value.startsWith('select')) return 'dropdown';
  if (value.startsWith('para') || value.startsWith('long')) return 'long_text';
  if (value.startsWith('file') || value.startsWith('upload')) return 'file';
  return 'short_text';
}

export type ImportResult = {
  fields: FormField[];
  skipped: number;
  warnings: string[];
};

// Reads .xlsx, .xls or .csv — whatever a person saved the template as.
export async function parseQuestionSheet(file: File, makeId: () => string): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const sheetName = book.SheetNames.find((n) => n.toLowerCase().startsWith('question')) || book.SheetNames[0];
  if (!sheetName) return { fields: [], skipped: 0, warnings: ['That file has no sheets in it.'] };

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(book.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: '',
  });

  const fields: FormField[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const cell = (i: number) => String(row?.[i] ?? '').trim();
    const question = cell(0);
    // Skip the header row, however it was capitalised.
    if (!question || (index === 0 && question.toLowerCase() === 'question')) return;

    const type = parseType(cell(1));
    const field: FormField = {
      id: makeId(),
      label: question.slice(0, 300),
      type,
      required: YES.has(cell(2).toLowerCase()),
      help: cell(3).slice(0, 600) || undefined,
    };

    if (['single_choice', 'multi_choice', 'dropdown'].includes(type)) {
      const options = cell(4)
        .split(/[|\n;]/)
        .map((o) => o.trim())
        .filter(Boolean)
        .slice(0, 60)
        .map((label) => ({ label: label.slice(0, 300) }));
      if (!options.length) {
        // A choice question with no options cannot be saved, so it is left
        // out and called out rather than silently turned into a text box.
        warnings.push(`Row ${index + 1}: “${question.slice(0, 40)}” is a choice question with no options — skipped.`);
        skipped += 1;
        return;
      }
      field.options = options;
    }

    if (type === 'file') {
      field.accept = 'any';
      field.maxSizeMb = 10;
    }

    fields.push(field);
  });

  if (!fields.length && !warnings.length) warnings.push('No questions were found in that file.');
  return { fields, skipped, warnings };
}
