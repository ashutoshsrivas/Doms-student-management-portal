// Rich text for form questions, options and descriptions.
//
// Formatted text is stored as a span tree, NOT as HTML:
//
//   [{ spans: [{ text, b, i, u, s, color }] }, ...]     // one entry per line
//
// The builder types into a contenteditable, but what gets saved is this
// structure, and the fill page renders it by building React elements. No
// builder-supplied string is ever handed to a browser as markup, so a form
// cannot carry a script into a responder's page — there is no injection
// surface to sanitise in the first place.
//
// Every formatted value also keeps a flattened plain-text twin (`label`,
// `help`, option `label`). That twin is what CSV headers, the per-question
// tallies and choice-answer matching use, so collected data never depends on
// how the question was styled.

// The colours a builder can pick. Anything else is dropped rather than
// corrected, so a stored colour is always one of these.
const RICH_COLORS = [
  '#111827', // near-black (the default)
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // amber
  '#16a34a', // green
  '#0891b2', // teal
  '#2563eb', // blue
  '#7c3aed', // violet
  '#db2777', // pink
  '#6b7280', // grey
];
const COLOR_SET = new Set(RICH_COLORS);

const MAX_LINES = 60;
const MAX_SPANS_PER_LINE = 60;

// Keep a formatted value and its plain twin in step. Returns
// { rich, text } — rich is null when the value carries no formatting worth
// storing, so a plain question stays a plain question on disk.
function cleanRich(input, maxChars = 2000) {
  if (!Array.isArray(input)) return { rich: null, text: '' };

  const lines = [];
  let used = 0;
  let formatted = false;

  for (const rawLine of input.slice(0, MAX_LINES)) {
    const rawSpans = Array.isArray(rawLine?.spans) ? rawLine.spans : [];
    const spans = [];
    for (const rawSpan of rawSpans.slice(0, MAX_SPANS_PER_LINE)) {
      if (used >= maxChars) break;
      let text = String(rawSpan?.text ?? '');
      // A tab or a stray newline inside a span would break the line model.
      text = text.replace(/[\r\n\t]+/g, ' ');
      if (!text) continue;
      if (used + text.length > maxChars) text = text.slice(0, maxChars - used);
      used += text.length;

      const span = { text };
      if (rawSpan?.b) span.b = true;
      if (rawSpan?.i) span.i = true;
      if (rawSpan?.u) span.u = true;
      if (rawSpan?.s) span.s = true;
      const color = String(rawSpan?.color || '').toLowerCase();
      if (COLOR_SET.has(color) && color !== RICH_COLORS[0]) span.color = color;
      if (span.b || span.i || span.u || span.s || span.color) formatted = true;
      spans.push(span);
    }
    lines.push({ spans });
    if (used >= maxChars) break;
  }

  // Trailing blank lines are an artefact of the editor, not intent.
  while (lines.length && !lines[lines.length - 1].spans.length) lines.pop();

  const text = lines.map((l) => l.spans.map((s) => s.text).join('')).join('\n').trim();
  if (!text) return { rich: null, text: '' };
  // Formatting, or a deliberate line break, is the only reason to keep the tree.
  const worthKeeping = formatted || lines.length > 1;
  return { rich: worthKeeping ? lines : null, text };
}

// Turn plain text into the same shape, so a bulk-imported question can be
// formatted later without a special case.
function richFromText(text) {
  const lines = String(text ?? '').split('\n');
  return lines.map((line) => ({ spans: line ? [{ text: line }] : [] }));
}

const flattenRich = (rich) =>
  (Array.isArray(rich) ? rich : [])
    .map((l) => (Array.isArray(l?.spans) ? l.spans.map((s) => String(s?.text ?? '')).join('') : ''))
    .join('\n')
    .trim();

module.exports = { RICH_COLORS, cleanRich, richFromText, flattenRich };
