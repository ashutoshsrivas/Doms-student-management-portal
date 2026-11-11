'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiDownload, FiLoader, FiMapPin, FiSmartphone, FiShield,
  FiAlertTriangle, FiCrosshair, FiX, FiUsers, FiEdit2, FiRefreshCw, FiEye,
  FiPaperclip,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  BAND_STYLES, FormSummary, ReportStats, ResponseRow,
  fmtBytes, fmtDateTime, fmtDistance, isChoice, isFileAnswer,
} from '@/app/lib/forms';
import { requestLocation } from '@/app/f/device';

const ADMIN_ROLES = ['ADMIN', 'HOD', 'COORDINATOR'];

// Module scope — see the Toggle note in the builder: a component created
// during render is remounted on every pass.
const Tile = ({ label, value, note, tone = 'gray' }: { label: string; value: string | number; note?: string; tone?: string }) => (
  <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
    <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold tabular-nums ${tone === 'rose' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p>
    {note && <p className="mt-0.5 truncate text-[11px] text-gray-400">{note}</p>}
  </div>
);

function Content() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [form, setForm] = useState<FormSummary | null>(null);
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [bands, setBands] = useState({ greenUpto: 50, yellowUpto: 200 });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // The security check
  const [checkOpen, setCheckOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [point, setPoint] = useState({ latitude: '', longitude: '', label: '' });
  const [savingPoint, setSavingPoint] = useState(false);

  const [detail, setDetail] = useState<ResponseRow | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/forms/${id}/responses`);
      setForm(res.data.form);
      setRows(res.data.responses || []);
      setStats(res.data.stats || null);
      if (res.data.bands) setBands(res.data.bands);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not load the responses');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const downloadCsv = async () => {
    try {
      setDownloading(true);
      const res = await apiClient.get(`/forms/${id}/responses.csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      const safe = (form?.title || 'form').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'form';
      a.download = `${safe}-responses-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download the CSV');
    } finally {
      setDownloading(false);
    }
  };

  // Where the member of staff running the check is standing.
  const useMyLocation = async () => {
    setLocating(true);
    const fix = await requestLocation();
    setLocating(false);
    if (fix.status !== 'GRANTED') {
      toast.error(fix.status === 'DENIED'
        ? 'Your browser refused the location request. Allow it for this site, or type the coordinates in.'
        : 'Your location is not available on this device. Type the coordinates in instead.');
      return;
    }
    setPoint((p) => ({
      ...p,
      latitude: String(fix.latitude?.toFixed(7) ?? ''),
      longitude: String(fix.longitude?.toFixed(7) ?? ''),
    }));
    toast.success(`Got your location (±${Math.round(fix.accuracy || 0)} m)`);
  };

  const savePoint = async () => {
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { toast.error('Enter both coordinates'); return; }
    try {
      setSavingPoint(true);
      const res = await apiClient.put(`/forms/${id}/security-point`, { latitude: lat, longitude: lng, label: point.label });
      toast.success(res.data.message);
      setCheckOpen(false);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not set the reference point');
    } finally {
      setSavingPoint(false);
    }
  };

  const clearPoint = async () => {
    if (!window.confirm('Clear the reference point? Distances will stop being shown.')) return;
    try {
      await apiClient.delete(`/forms/${id}/security-point`);
      toast.success('Reference point cleared');
      load();
    } catch {
      toast.error('Could not clear the reference point');
    }
  };

  const visible = useMemo(
    () => (onlyFlagged ? rows.filter((r) => r.repeatedDevice || r.band === 'RED') : rows),
    [rows, onlyFlagged],
  );

  if (loading || !form || !stats) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-gray-500">
        <FiLoader className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const hasPoint = !!form.securityPoint;
  const flaggedCount = rows.filter((r) => r.repeatedDevice || r.band === 'RED').length;

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/forms" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900">
            <FiArrowLeft className="h-3.5 w-3.5" /> All forms
          </Link>
          <h1 className="mt-1.5 truncate text-xl font-bold text-gray-900 sm:text-2xl">{form.title}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {stats.total} response{stats.total === 1 ? '' : 's'}
            {stats.firstAt && <> · first {fmtDateTime(stats.firstAt)} · latest {fmtDateTime(stats.lastAt)}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <FiRefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link href={`/admin/forms/${form.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <FiEdit2 className="h-4 w-4" /> Edit form
          </Link>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={downloading || !stats.total}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {downloading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiDownload className="h-4 w-4" />} CSV
          </button>
        </div>
      </div>

      {/* tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Responses" value={stats.total} />
        {form.collectLocation && (
          <Tile
            label="With location"
            value={stats.withLocation}
            note={stats.locationDenied ? `${stats.locationDenied} refused` : undefined}
          />
        )}
        {form.collectDevice && <Tile label="Unique devices" value={stats.uniqueDevices} />}
        {form.collectDevice && (
          <Tile
            label="Repeated device"
            value={stats.repeatedDeviceResponses}
            note={stats.repeatedDevices.length ? `${stats.repeatedDevices.length} device${stats.repeatedDevices.length === 1 ? '' : 's'} reused` : 'none'}
            tone={stats.repeatedDeviceResponses ? 'rose' : 'gray'}
          />
        )}
      </div>

      {/* the security check */}
      {form.collectLocation && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FiShield className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">Security check</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {hasPoint
                    ? <>Measured from {form.securityPoint!.label || 'the reference point'} ({form.securityPoint!.latitude.toFixed(5)}, {form.securityPoint!.longitude.toFixed(5)}), set {fmtDateTime(form.securityPoint!.setAt)}.</>
                    : <>Set a reference point — usually where you are standing — and every response is measured against it.</>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setCheckOpen(true); setPoint({ latitude: '', longitude: '', label: '' }); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <FiCrosshair className="h-4 w-4" /> {hasPoint ? 'Set a new point' : 'Run security check'}
              </button>
              {hasPoint && (
                <button type="button" onClick={clearPoint} className="rounded-full border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  Clear
                </button>
              )}
            </div>
          </div>

          {hasPoint && stats.bands && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                <p className="text-[11px] font-semibold text-emerald-800">Up to {bands.greenUpto} m</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-700">{stats.bands.green}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <p className="text-[11px] font-semibold text-amber-800">Up to {bands.yellowUpto} m</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-amber-700">{stats.bands.yellow}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
                <p className="text-[11px] font-semibold text-rose-800">Over {bands.yellowUpto} m</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-rose-700">{stats.bands.red}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
                <p className="text-[11px] font-semibold text-gray-600">No location</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-500">{stats.bands.unmeasured}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* devices that answered more than once */}
      {!!stats.repeatedDevices.length && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white text-rose-600">
              <FiAlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-rose-900">
                {stats.repeatedDevices.length} device{stats.repeatedDevices.length === 1 ? '' : 's'} answered more than once
              </h2>
              <div className="mt-2 space-y-1.5">
                {stats.repeatedDevices.map((d) => (
                  <div key={d.fingerprint} className="flex flex-wrap items-baseline gap-x-2 text-xs text-rose-900">
                    <span className="font-semibold">{d.count}×</span>
                    <span>{d.label || 'Unknown device'}</span>
                    <code className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-rose-700">{d.fingerprint.slice(0, 12)}</code>
                    <span className="min-w-0 text-rose-700">— {d.respondents.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* per-question summary */}
      {!!stats.total && (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.fields.map((f) => (
            <div key={f.id} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5">
              <p className="truncate text-sm font-semibold text-gray-900">{f.label}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{f.answered} of {stats.total} answered</p>
              {isChoice(f.type) && f.options && (
                <div className="mt-3 space-y-2">
                  {f.options.map((o) => {
                    const pct = f.answered ? Math.round((o.count / f.answered) * 100) : 0;
                    return (
                      <div key={o.label} className="min-w-0">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate text-gray-700">{o.label}</span>
                          <span className="flex-none font-semibold tabular-nums text-gray-900">{o.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {f.numeric && (
                <p className="mt-3 text-xs text-gray-600">
                  min <span className="font-semibold tabular-nums">{f.numeric.min}</span> ·
                  avg <span className="font-semibold tabular-nums">{f.numeric.average}</span> ·
                  max <span className="font-semibold tabular-nums">{f.numeric.max}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* the table */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-bold text-gray-900">Responses</h2>
          {!!flaggedCount && (
            <button
              type="button"
              onClick={() => setOnlyFlagged((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                onlyFlagged ? 'bg-rose-600 text-white ring-rose-600' : 'bg-white text-rose-700 ring-rose-200 hover:bg-rose-50'
              }`}
            >
              {onlyFlagged ? 'Showing flagged only' : `Show flagged only (${flaggedCount})`}
            </button>
          )}
        </div>

        {!visible.length ? (
          <div className="px-5 py-14 text-center text-sm text-gray-500">
            {stats.total ? 'Nothing matches that filter.' : 'No responses yet. Share the link and they will appear here.'}
          </div>
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">#</th>
                  <th className="px-4 py-2.5 font-semibold">Respondent</th>
                  <th className="px-4 py-2.5 font-semibold">Submitted</th>
                  {form.collectLocation && <th className="px-4 py-2.5 font-semibold">Location</th>}
                  {hasPoint && <th className="px-4 py-2.5 font-semibold">Distance</th>}
                  {form.collectDevice && <th className="px-4 py-2.5 font-semibold">Device</th>}
                  <th className="px-4 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((r) => {
                  const band = r.band ? BAND_STYLES[r.band] : null;
                  return (
                    <tr key={r.id} className={r.repeatedDevice ? 'bg-rose-50/40' : band ? band.row : ''}>
                      <td className="px-4 py-3 text-xs tabular-nums text-gray-400">{r.index}</td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate font-semibold text-gray-900">{r.name || <span className="font-normal text-gray-400">Anonymous</span>}</p>
                        <p className="truncate text-[11px] text-gray-500">
                          {[r.registrationNumber, r.session, r.email].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{fmtDateTime(r.submittedAt)}</td>
                      {form.collectLocation && (
                        <td className="px-4 py-3 text-xs">
                          {r.latitude !== null ? (
                            <a
                              href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
                            >
                              <FiMapPin className="h-3 w-3" />
                              {r.latitude.toFixed(5)}, {r.longitude!.toFixed(5)}
                            </a>
                          ) : (
                            <span className="text-gray-400">
                              {r.locationStatus === 'DENIED' ? 'refused' : r.locationStatus === 'UNAVAILABLE' ? 'unavailable' : '—'}
                            </span>
                          )}
                          {r.locationAccuracy !== null && r.latitude !== null && (
                            <span className="ml-1 text-gray-400">±{Math.round(r.locationAccuracy)} m</span>
                          )}
                        </td>
                      )}
                      {hasPoint && (
                        <td className="whitespace-nowrap px-4 py-3">
                          {band ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${band.chip}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${band.dot}`} />
                              {fmtDistance(r.distanceMetres)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      {form.collectDevice && (
                        <td className="max-w-[200px] px-4 py-3 text-xs">
                          {r.deviceFingerprint ? (
                            <>
                              <p className="truncate text-gray-700">{r.deviceLabel}</p>
                              <p className="truncate font-mono text-[10px] text-gray-400">{r.deviceFingerprint.slice(0, 12)}</p>
                              {r.repeatedDevice && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                                  <FiUsers className="h-2.5 w-2.5" /> {r.deviceUseCount}× this device
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">not shared</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetail(r)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          <FiEye className="h-3 w-3" /> Answers
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* set the reference point */}
      {checkOpen && (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="w-full min-w-0 max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <h2 className="text-lg font-bold text-gray-900">Reference point</h2>
            <p className="mt-1 text-sm text-gray-500">
              Every response with a location is measured from here. Up to {bands.greenUpto} m is green,
              up to {bands.yellowUpto} m amber, beyond that red.
            </p>

            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {locating ? <><FiLoader className="h-4 w-4 animate-spin" /> Asking your browser…</> : <><FiCrosshair className="h-4 w-4" /> Use my current location</>}
            </button>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Latitude</label>
                <input
                  className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  value={point.latitude}
                  onChange={(e) => setPoint((p) => ({ ...p, latitude: e.target.value }))}
                  placeholder="30.2729"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Longitude</label>
                <input
                  className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  value={point.longitude}
                  onChange={(e) => setPoint((p) => ({ ...p, longitude: e.target.value }))}
                  placeholder="78.0059"
                />
              </div>
            </div>
            <label className="mt-3 mb-1 block text-xs font-semibold text-gray-700">What is here? <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={point.label}
              onChange={(e) => setPoint((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Exam hall, block B"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCheckOpen(false)} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={savePoint}
                disabled={savingPoint}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {savingPoint ? <><FiLoader className="h-4 w-4 animate-spin" /> Measuring…</> : 'Measure distances'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* one response in full */}
      {detail && (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full min-w-0 max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-900">{detail.name || 'Anonymous'}</h2>
                <p className="truncate text-xs text-gray-500">
                  {[detail.registrationNumber, detail.session, detail.email].filter(Boolean).join(' · ') || fmtDateTime(detail.submittedAt)}
                </p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {(form.fields || []).map((f) => {
                const v = detail.answers?.[f.id];
                return (
                  <div key={f.id} className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500">{f.label}</p>
                    {isFileAnswer(v) ? (
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        <FiPaperclip className="h-3.5 w-3.5 flex-none" />
                        <span className="min-w-0 truncate">{v.name || 'file'}</span>
                        {!!v.size && <span className="flex-none font-normal text-gray-400">{fmtBytes(v.size)}</span>}
                      </a>
                    ) : (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-900">
                        {Array.isArray(v) ? v.join(', ') : (v || <span className="text-gray-400">—</span>)}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="space-y-1.5 rounded-xl bg-gray-50 px-4 py-3 text-[11px] text-gray-600">
                <p>Submitted {fmtDateTime(detail.submittedAt)}</p>
                {form.collectLocation && (
                  <p className="inline-flex items-center gap-1.5">
                    <FiMapPin className="h-3 w-3" />
                    {detail.latitude !== null
                      ? <>{detail.latitude.toFixed(6)}, {detail.longitude!.toFixed(6)} (±{Math.round(detail.locationAccuracy || 0)} m){detail.distanceMetres !== null && <> · {fmtDistance(detail.distanceMetres)} from the reference point</>}</>
                      : detail.locationStatus === 'DENIED' ? 'location refused' : 'location unavailable'}
                  </p>
                )}
                {form.collectDevice && (
                  <p className="inline-flex items-start gap-1.5">
                    <FiSmartphone className="mt-0.5 h-3 w-3 flex-none" />
                    <span className="min-w-0">
                      {detail.deviceFingerprint
                        ? <>{detail.deviceLabel} · <code className="font-mono">{detail.deviceFingerprint}</code>
                            {detail.deviceDetails?.screen && <> · {String(detail.deviceDetails.screen)}</>}
                            {detail.deviceDetails?.timezone && <> · {String(detail.deviceDetails.timezone)}</>}
                            {detail.repeatedDevice && <span className="font-bold text-rose-700"> · used by {detail.deviceUseCount} responses</span>}</>
                        : 'device not shared'}
                    </span>
                  </p>
                )}
                {detail.ipAddress && <p>IP {detail.ipAddress}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormResponsesPage() {
  return (
    <ProtectedRoute requiredRoles={ADMIN_ROLES}>
      <DashboardLayout>
        <Content />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
