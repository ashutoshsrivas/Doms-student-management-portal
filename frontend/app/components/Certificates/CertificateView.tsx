'use client';

import { useEffect, useRef, useState } from 'react';
import { FiDownload, FiLoader } from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';

export type CertField = {
  id: string;
  type: string;
  label: string;
  value?: string;
  xPct: number;
  yPct: number;
  fontPct: number;
  color: string;
  fontFamily?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
};

type Props = {
  certificationId: string;
  title: string;
  templateWidth?: number | null;
  templateHeight?: number | null;
  fields: CertField[];
  values?: Record<string, string>; // resolved per-recipient values; absent = builder preview
  certificateNumber?: string;
  showDownload?: boolean;
};

// jsPDF fonts are limited; map our families onto its built-ins.
const pdfFontFor = (family?: string) => {
  if (family === 'times') return 'times';
  if (family === 'courier') return 'courier';
  return 'helvetica';
};
const cssFontFor = (family?: string) => {
  if (family === 'times') return 'Georgia, "Times New Roman", serif';
  if (family === 'courier') return '"Courier New", monospace';
  return 'Helvetica, Arial, sans-serif';
};
const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

const displayValue = (f: CertField, values?: Record<string, string>) => {
  if (values && values[f.id] !== undefined) return values[f.id];
  // Builder preview fallbacks.
  switch (f.type) {
    case 'STUDENT_NAME': return f.label || 'Student Name';
    case 'REGISTRATION_NUMBER': return 'REG-0000';
    case 'EMAIL': return 'student@example.com';
    case 'ISSUE_DATE': return '01 January 2026';
    case 'CERTIFICATE_ID': return 'GESoM-2026-XXXXXXXX';
    case 'CUSTOM_TEXT': return f.value || f.label || 'Custom text';
    default: return f.value || f.label || '';
  }
};

export default function CertificateView({
  certificationId, title, templateWidth, templateHeight, fields, values, certificateNumber, showDownload = true,
}: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const aspect = templateWidth && templateHeight ? `${templateWidth} / ${templateHeight}` : '1.414 / 1';

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/certifications/${certificationId}/template-image`, { responseType: 'blob' });
        objectUrl = URL.createObjectURL(res.data);
        if (!revoked) setImgUrl(objectUrl);
      } catch {
        if (!revoked) setImgUrl(null);
      } finally {
        if (!revoked) setLoading(false);
      }
    })();
    return () => { revoked = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [certificationId]);

  const download = async () => {
    if (!imgUrl || !templateWidth || !templateHeight) {
      toast.error('Certificate image not ready');
      return;
    }
    try {
      setDownloading(true);
      const { jsPDF } = await import('jspdf');
      // Load the (same-origin blob) image element for jsPDF.
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imgUrl;
      });
      const W = templateWidth;
      const H = templateHeight;
      const orientation = W >= H ? 'landscape' : 'portrait';
      const doc = new jsPDF({ orientation, unit: 'pt', format: [W, H] });
      doc.addImage(img, 'PNG', 0, 0, W, H);
      for (const f of fields) {
        const text = displayValue(f, values);
        if (!text) continue;
        doc.setFont(pdfFontFor(f.fontFamily), f.bold ? 'bold' : 'normal');
        doc.setFontSize((f.fontPct / 100) * H);
        const [r, g, b] = hexToRgb(f.color || '#000000');
        doc.setTextColor(r, g, b);
        doc.text(text, (f.xPct / 100) * W, (f.yPct / 100) * H, {
          align: f.align || 'center',
          baseline: 'middle',
        });
      }
      const safe = (s: string) => s.replace(/[^\w.-]+/g, '_').slice(0, 60);
      doc.save(`${safe(title)}${certificateNumber ? '-' + safe(certificateNumber) : ''}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={boxRef}
        className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        style={{ aspectRatio: aspect, containerType: 'size' }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            <FiLoader className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={title} className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">No template image</div>
        )}
        {imgUrl && fields.map((f) => {
          const anchor = f.align === 'left' ? 'translate(0,-50%)' : f.align === 'right' ? 'translate(-100%,-50%)' : 'translate(-50%,-50%)';
          return (
            <div
              key={f.id}
              className="pointer-events-none absolute whitespace-nowrap"
              style={{
                left: `${f.xPct}%`,
                top: `${f.yPct}%`,
                transform: anchor,
                fontSize: `${f.fontPct}cqh`,
                color: f.color,
                fontFamily: cssFontFor(f.fontFamily),
                fontWeight: f.bold ? 700 : 400,
                lineHeight: 1,
              }}
            >
              {displayValue(f, values)}
            </div>
          );
        })}
      </div>
      {showDownload && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={download}
            disabled={downloading || loading || !imgUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {downloading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiDownload className="h-4 w-4" />}
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      )}
    </div>
  );
}
