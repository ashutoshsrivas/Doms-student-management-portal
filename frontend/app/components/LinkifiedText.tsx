'use client';

// Renders plain text with any URLs turned into clickable anchors.
// Preserves newlines (whitespace-pre-wrap on the wrapper). Intentionally
// simple: no markdown, no HTML — links are the only rich element.
// Detects http(s):// URLs and bare www.* URLs (prefixed with https:// on
// href resolution).

import React from 'react';

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)])/gi;

function toHref(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export default function LinkifiedText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const src = text || '';
  if (!src) return <span className={className} />;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(src)) !== null) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) {
      parts.push(src.slice(lastIndex, start));
    }
    parts.push(
      <a
        key={`${start}-${url}`}
        href={toHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 underline break-all"
      >
        {url}
      </a>,
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < src.length) parts.push(src.slice(lastIndex));

  return <span className={className}>{parts}</span>;
}
