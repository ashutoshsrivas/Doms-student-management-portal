'use client';

// Renders a compact preview for a file URL:
//   - Images: inline thumbnail, click to open full-size
//   - PDF:    small embed with a "Open" fallback button
//   - Other:  file icon + name + open link
// Falls back gracefully when mime is missing (sniffs the URL extension).

import { useState } from 'react';
import {
  FiFile, FiFileText, FiPaperclip, FiExternalLink, FiDownload, FiImage, FiPlayCircle,
} from 'react-icons/fi';

type Variant = 'compact' | 'inline';

interface Props {
  url: string;
  name?: string | null;
  mime?: string | null;
  variant?: Variant; // compact = small tile; inline = single-line link
  className?: string;
}

function sniffMime(url: string, mime?: string | null): string {
  if (mime) return mime;
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(jpe?g|png|gif|webp|bmp|avif|svg)$/.test(clean)) return 'image/*';
  if (/\.pdf$/.test(clean)) return 'application/pdf';
  if (/\.(mp4|webm|mov|m4v)$/.test(clean)) return 'video/*';
  if (/\.(mp3|wav|ogg|m4a)$/.test(clean)) return 'audio/*';
  if (/\.(txt|md|log|csv)$/.test(clean)) return 'text/plain';
  return 'application/octet-stream';
}

function isImage(m: string) { return m.startsWith('image/'); }
function isPdf(m: string) { return m === 'application/pdf'; }
function isVideo(m: string) { return m.startsWith('video/'); }
function isAudio(m: string) { return m.startsWith('audio/'); }

function iconFor(m: string) {
  if (isImage(m)) return <FiImage size={14} />;
  if (isPdf(m)) return <FiFileText size={14} />;
  if (isVideo(m)) return <FiPlayCircle size={14} />;
  if (isAudio(m)) return <FiPlayCircle size={14} />;
  return <FiFile size={14} />;
}

export default function FilePreview({ url, name, mime, variant = 'compact', className }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const eff = sniffMime(url, mime);
  const label = name || url.split('/').pop() || 'File';

  // Inline (single-line link) — used when preview would be overkill.
  if (variant === 'inline') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline ${className || ''}`}
      >
        <FiPaperclip size={11} /> <span className="truncate max-w-[16rem]">{label}</span>
        <FiExternalLink size={11} />
      </a>
    );
  }

  // Compact: bordered tile with mime-aware preview
  return (
    <div className={`rounded-lg border border-gray-200 bg-white overflow-hidden ${className || ''}`}>
      {/* Preview surface */}
      {isImage(eff) && !imgFailed ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            onError={() => setImgFailed(true)}
            className="w-full max-h-64 object-contain"
          />
        </a>
      ) : isPdf(eff) ? (
        <div className="bg-gray-50">
          <object data={url} type="application/pdf" className="w-full h-64">
            <div className="p-4 text-xs text-gray-500 text-center">
              PDF preview not supported in this browser.
            </div>
          </object>
        </div>
      ) : isVideo(eff) ? (
        <video src={url} controls className="w-full max-h-64 bg-black" />
      ) : isAudio(eff) ? (
        <audio src={url} controls className="w-full" />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 text-gray-500">
          <FiFile size={36} />
          <span className="text-xs mt-2 px-2 truncate max-w-full">{label}</span>
        </div>
      )}
      {/* Meta bar */}
      <div className="px-2.5 py-1.5 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-gray-700 min-w-0">
          <span className="text-gray-500 shrink-0">{iconFor(eff)}</span>
          <span className="truncate">{label}</span>
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-700 hover:underline shrink-0"
          title="Open in a new tab"
        >
          <FiDownload size={11} /> Open
        </a>
      </div>
    </div>
  );
}
