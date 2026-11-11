// What the browser will tell us about the device it is running on.
//
// There is no MAC address here, and there cannot be: no web API exposes one,
// on any browser. What follows are the signals a page *can* read, hashed on
// the server into a fingerprint that is stable for a given device + browser —
// enough to notice that the same device answered twice.

export type DeviceSignals = {
  platform: string;
  screen: string;
  timezone: string;
  language: string;
  cores: number | null;
  memory: number | null;
  touch: number | null;
  canvas: string;
  webgl: string;
  browser: string;
  os: string;
};

const browserName = (ua: string) =>
  /Edg\//.test(ua) ? 'Edge'
  : /OPR\//.test(ua) ? 'Opera'
  : /SamsungBrowser\//.test(ua) ? 'Samsung Internet'
  : /Chrome\//.test(ua) ? 'Chrome'
  : /Firefox\//.test(ua) ? 'Firefox'
  : /Safari\//.test(ua) ? 'Safari'
  : 'Unknown browser';

const osName = (ua: string) =>
  /Windows/.test(ua) ? 'Windows'
  : /Android/.test(ua) ? 'Android'
  : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
  : /Mac OS X/.test(ua) ? 'macOS'
  : /Linux/.test(ua) ? 'Linux'
  : 'unknown OS';

// A short digest of how this device rasterises text and a gradient. Differs
// with the GPU, the driver and the installed fonts.
function canvasSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const gradient = ctx.createLinearGradient(0, 0, 220, 0);
    gradient.addColorStop(0, '#4f46e5');
    gradient.addColorStop(1, '#db2777');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 220, 60);
    ctx.font = '16px "Arial"';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('DOMS device check ✓ 0123456789', 4, 24);
    ctx.font = 'italic 13px "Times New Roman"';
    ctx.fillText('gyqj éèç — µΩ', 4, 48);
    const data = canvas.toDataURL();
    // Fold the data URL down to something short; the server hashes it again.
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < data.length; i += 1) {
      h1 = ((h1 ^ data.charCodeAt(i)) * 16777619) >>> 0;
      h2 = ((h2 + data.charCodeAt(i) * (i + 1)) * 2654435761) >>> 0;
    }
    return `${h1.toString(16)}${h2.toString(16)}`;
  } catch {
    return '';
  }
}

// The GPU string, where the browser hands it over.
function webglSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '') : '';
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    return `${vendor}~${renderer}`.slice(0, 180);
  } catch {
    return '';
  }
}

export function collectDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { platform?: string };
  };
  const ua = nav.userAgent || '';
  return {
    platform: nav.userAgentData?.platform || nav.platform || '',
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}@${window.devicePixelRatio || 1}`,
    timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })(),
    language: nav.language || '',
    cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    memory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    touch: typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : null,
    canvas: canvasSignature(),
    webgl: webglSignature(),
    browser: browserName(ua),
    os: osName(ua),
  };
}

export type LocationResult = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  status: 'GRANTED' | 'DENIED' | 'UNAVAILABLE';
};

// Asks the browser for a fix. A refusal resolves — it never rejects — because
// the form still has to decide what to do next.
export function requestLocation(timeoutMs = 15000): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ status: 'UNAVAILABLE' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        status: 'GRANTED',
      }),
      (err) => resolve({ status: err.code === err.PERMISSION_DENIED ? 'DENIED' : 'UNAVAILABLE' }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
