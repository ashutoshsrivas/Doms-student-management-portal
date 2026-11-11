// QR codes for a form's public link.
//
// Two different things share this file. A *static* code encodes the plain
// link and never goes stale — that is the one worth printing. A *rotating*
// code encodes a link with a short-lived token in it, so a photograph of the
// screen stops working within seconds; the display page asks the backend for
// a fresh token each turn.

import QRCode from 'qrcode';

export const qrDataUrl = (text: string, size = 1024) =>
  QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    // M survives a printed page being scuffed without bloating the grid.
    errorCorrectionLevel: 'M',
    color: { dark: '#111827ff', light: '#ffffffff' },
  });

export async function downloadQr(text: string, filename: string, size = 1024) {
  const dataUrl = await qrDataUrl(text, size);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const safeFileName = (title: string, fallback = 'form') =>
  String(title || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase() || fallback;
