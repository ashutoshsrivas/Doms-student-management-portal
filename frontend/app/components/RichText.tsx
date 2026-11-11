'use client';

// Formatting for form questions, options and help text.
//
// What gets stored is a span tree (see app/lib/forms.ts), not HTML. The
// editor is a contenteditable, but its DOM is read back into that tree on
// every keystroke and thrown away; the fill page renders the tree as React
// elements. No builder-typed string is ever handed to a browser as markup,
// so a form cannot carry a script to a responder.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiBold, FiItalic, FiUnderline, FiDroplet, FiRotateCcw, FiType,
} from 'react-icons/fi';
import { Rich, RichLine, RichSpan, RICH_COLORS, richToText, textToRich } from '@/app/lib/forms';

const COLOR_SET = new Set(RICH_COLORS.map((c) => c.toLowerCase()));

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const spanStyle = (span: RichSpan) => {
  // A colour is checked again here: a tree that somehow arrived with
  // something else in it renders in the default colour rather than obeying it.
  const color = span.color && COLOR_SET.has(span.color.toLowerCase()) ? span.color : undefined;
  return color ? { color } : undefined;
};

const decorationOf = (span: RichSpan) => {
  const parts: string[] = [];
  if (span.u) parts.push('underline');
  if (span.s) parts.push('line-through');
  return parts.length === 2 ? 'underline line-through' : parts[0] || '';
};

function SpanView({ span }: { span: RichSpan }) {
  let node: React.ReactNode = span.text;
  if (span.b) node = <strong className="font-bold">{node}</strong>;
  if (span.i) node = <em className="italic">{node}</em>;
  const decoration = decorationOf(span);
  if (!span.color && !decoration) return <>{node}</>;
  return <span className={decoration} style={spanStyle(span)}>{node}</span>;
}

// Renders formatted text, falling back to the plain twin when a value was
// never formatted.
export function RichView({ rich, text, className }: {
  rich?: Rich | null;
  text?: string | null;
  className?: string;
}) {
  const lines: Rich = rich && rich.length ? rich : textToRich(text || '');
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {(line.spans || []).map((span, si) => <SpanView key={si} span={span} />)}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Reading the editor's DOM back into a span tree
// ---------------------------------------------------------------------------

type Fmt = { b?: boolean; i?: boolean; u?: boolean; s?: boolean; color?: string };

const rgbToHex = (value: string) => {
  const m = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return value.trim().toLowerCase();
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`.toLowerCase();
};

const keepColor = (raw: string | null | undefined): string | undefined => {
  if (!raw) return undefined;
  const hex = rgbToHex(String(raw));
  return COLOR_SET.has(hex) ? hex : undefined;
};

function fmtFor(el: HTMLElement, inherited: Fmt): Fmt {
  const next: Fmt = { ...inherited };
  const tag = el.tagName;
  if (tag === 'B' || tag === 'STRONG') next.b = true;
  if (tag === 'I' || tag === 'EM') next.i = true;
  if (tag === 'U') next.u = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.s = true;
  // execCommand('foreColor') writes <font color> in some browsers and an
  // inline style in others, so both are read.
  const fontColor = el.getAttribute?.('color');
  const styleColor = el.style?.color;
  const color = keepColor(fontColor) || keepColor(styleColor);
  if (color) next.color = color;
  const weight = el.style?.fontWeight;
  if (weight === 'bold' || Number(weight) >= 600) next.b = true;
  if (el.style?.fontStyle === 'italic') next.i = true;
  const decoration = `${el.style?.textDecoration || ''} ${el.style?.textDecorationLine || ''}`;
  if (decoration.includes('underline')) next.u = true;
  if (decoration.includes('line-through')) next.s = true;
  return next;
}

const sameFmt = (a: RichSpan, b: Fmt) =>
  !!a.b === !!b.b && !!a.i === !!b.i && !!a.u === !!b.u && !!a.s === !!b.s
  && (a.color || '') === (b.color || '');

const BLOCKS = new Set(['DIV', 'P', 'LI', 'TR', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE']);

function serialize(root: HTMLElement): Rich {
  const lines: RichLine[] = [{ spans: [] }];
  const current = () => lines[lines.length - 1];
  const newline = () => { lines.push({ spans: [] }); };

  const push = (raw: string, fmt: Fmt) => {
    const text = raw.replace(/\r/g, '').replace(/ /g, ' ');
    if (!text) return;
    const spans = current().spans;
    const last = spans[spans.length - 1];
    // Merging runs keeps the stored tree small; browsers love to split text
    // nodes as you type.
    if (last && sameFmt(last, fmt)) last.text += text;
    else spans.push({ text, ...(fmt.b ? { b: true } : {}), ...(fmt.i ? { i: true } : {}), ...(fmt.u ? { u: true } : {}), ...(fmt.s ? { s: true } : {}), ...(fmt.color ? { color: fmt.color } : {}) });
  };

  const walk = (node: Node, fmt: Fmt) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        push(child.nodeValue || '', fmt);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      if (el.tagName === 'BR') { newline(); return; }
      // A block starts a new line only when the current one has something on
      // it, so the first <div> the browser inserts does not leave a blank.
      if (BLOCKS.has(el.tagName) && current().spans.length) newline();
      walk(el, fmtFor(el, fmt));
    });
  };

  walk(root, {});
  while (lines.length && !lines[lines.length - 1].spans.length) lines.pop();
  return lines;
}

// The editor's starting DOM, built from a tree we already hold. Text is
// escaped and only these few tags are emitted.
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toHtml(rich: Rich): string {
  return rich
    .map((line) => (line.spans || []).map((span) => {
      let html = escapeHtml(span.text) || '';
      if (span.b) html = `<b>${html}</b>`;
      if (span.i) html = `<i>${html}</i>`;
      if (span.u) html = `<u>${html}</u>`;
      if (span.s) html = `<s>${html}</s>`;
      const color = span.color && COLOR_SET.has(span.color.toLowerCase()) ? span.color : null;
      if (color) html = `<span style="color:${color}">${html}</span>`;
      return html;
    }).join('') || '<br>')
    .join('<br>');
}

// ---------------------------------------------------------------------------
// The editor
// ---------------------------------------------------------------------------

const toolButton = 'flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-white hover:text-gray-900';

export function RichEditor({
  rich, text, onChange, placeholder, singleLine, className, minHeight = 42,
}: {
  rich?: Rich | null;
  text?: string | null;
  onChange: (next: { rich: Rich | null; text: string }) => void;
  placeholder?: string;
  singleLine?: boolean;
  className?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const emitted = useRef<string>('');
  const [showColors, setShowColors] = useState(false);
  const [empty, setEmpty] = useState(true);

  const incoming: Rich = rich && rich.length ? rich : textToRich(text || '');

  // Seed the DOM only when what is on screen is not already the value coming
  // in. Rewriting it on every render would throw the caret back to the start.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incomingKey = JSON.stringify(incoming);
    if (incomingKey === emitted.current) return;
    if (document.activeElement === el) return;
    el.innerHTML = toHtml(incoming);
    emitted.current = incomingKey;
    setEmpty(!richToText(incoming).trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(incoming)]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = serialize(el);
    emitted.current = JSON.stringify(next);
    const plain = richToText(next).trim();
    setEmpty(!plain);
    // A value with no formatting and no line break is stored as plain text —
    // the tree would say nothing the text does not.
    const formatted = next.some((line) => (line.spans || []).some((s) => s.b || s.i || s.u || s.s || s.color));
    onChange({ rich: formatted || next.length > 1 ? next : null, text: plain });
  }, [onChange]);

  // document.execCommand is deprecated but still the only thing every browser
  // implements for inline formatting inside a contenteditable, and the result
  // is read back into our own tree immediately, so the markup it writes is
  // never what gets stored.
  const run = (command: string, value?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(command, false, value);
    } catch {
      // A browser that refuses the command simply leaves the text as it was.
    }
    emit();
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 ${className || ''}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/80 px-1.5 py-1">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('bold')} title="Bold" className={toolButton}><FiBold className="h-3.5 w-3.5" /></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('italic')} title="Italic" className={toolButton}><FiItalic className="h-3.5 w-3.5" /></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('underline')} title="Underline" className={toolButton}><FiUnderline className="h-3.5 w-3.5" /></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('strikeThrough')} title="Strikethrough" className={`${toolButton} line-through`}>S</button>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <div className="relative">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowColors((v) => !v)} title="Colour" className={toolButton}>
            <FiDroplet className="h-3.5 w-3.5" />
          </button>
          {showColors && (
            <div className="absolute left-0 top-8 z-50 flex w-44 flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              {RICH_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { run('foreColor', color); setShowColors(false); }}
                  title={color}
                  className="h-6 w-6 rounded-md ring-1 ring-black/10 transition hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run('removeFormat')} title="Clear formatting" className={toolButton}>
          <FiRotateCcw className="h-3.5 w-3.5" />
        </button>
        {!singleLine && (
          <span className="ml-auto hidden items-center gap-1 pr-1 text-[10px] text-gray-400 sm:flex">
            <FiType className="h-3 w-3" /> Enter for a new line
          </span>
        )}
      </div>
      <div className="relative">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={!singleLine}
          aria-label={placeholder || 'Formatted text'}
          onInput={emit}
          onBlur={emit}
          onKeyDown={(e) => {
            if (singleLine && e.key === 'Enter') e.preventDefault();
          }}
          onPaste={(e) => {
            // Paste as plain text: there is no reason to drag another page's
            // markup into the editor just to strip it again on the way out.
            e.preventDefault();
            const plain = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, singleLine ? plain.replace(/[\r\n]+/g, ' ') : plain);
            emit();
          }}
          className="w-full min-w-0 break-words px-3.5 py-2.5 text-sm text-gray-900 outline-none"
          style={{ minHeight }}
        />
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3.5 top-2.5 select-none text-sm text-gray-400">
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
}
