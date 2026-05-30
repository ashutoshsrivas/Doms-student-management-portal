'use client';

// Fetches the logged-in user's effective permissions from
// /api/auth/me/permissions and caches them in module-local state.
// Consumers get a synchronous `hasPerm(key)` helper that's
// fast / reactive across the whole app.
//
// Strategy: single in-memory store, one fetch per page-load (cached
// for ~60s to avoid hammering on every tab/route change). Bumping
// the cache after a permission edit can be done by calling
// `refreshPermissions()`.

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/app/lib/apiClient';
import useAuthStore from '@/app/store/authStore';

interface PermissionsState {
  loaded: boolean;
  perms: Set<string>;
  lastFetchedAt: number;
  inFlight: Promise<void> | null;
}

const STATE: PermissionsState = {
  loaded: false,
  perms: new Set(),
  lastFetchedAt: 0,
  inFlight: null,
};
const STALE_MS = 60_000;
const listeners = new Set<() => void>();

function notify() { for (const l of listeners) l(); }

async function fetchPermissions(): Promise<void> {
  if (STATE.inFlight) return STATE.inFlight;
  STATE.inFlight = (async () => {
    try {
      const res = await apiClient.get('/auth/me/permissions');
      STATE.perms = new Set<string>(res.data?.permissions || []);
      STATE.loaded = true;
      STATE.lastFetchedAt = Date.now();
      notify();
    } catch (e) {
      // Silently keep prior cache; gates that depend on perms will simply
      // fall back to the role-based check.
      console.warn('[usePermissions] fetch failed', e);
    } finally {
      STATE.inFlight = null;
    }
  })();
  return STATE.inFlight;
}

/** Force refetch on next call. Use after toggling a permission server-side. */
export function refreshPermissions(): void {
  STATE.lastFetchedAt = 0;
  STATE.loaded = false;
  fetchPermissions();
}

/**
 * Hook used by sidebar items and page guards. Returns:
 *   - loaded: false while the first fetch is in-flight
 *   - hasPerm(key): synchronous check against the cached set
 *   - perms: the raw Set (useful for debugging / dev tools)
 */
export default function usePermissions() {
  const { user } = useAuthStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const stale = Date.now() - STATE.lastFetchedAt > STALE_MS;
    if (!STATE.loaded || stale) fetchPermissions();
    const onChange = () => setTick((n) => n + 1);
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, [user?.id]);

  const hasPerm = useCallback((key: string): boolean => STATE.perms.has(key), []);
  const hasAnyPerm = useCallback((...keys: string[]): boolean => keys.some((k) => STATE.perms.has(k)), []);

  return {
    loaded: STATE.loaded,
    perms: STATE.perms,
    hasPerm,
    hasAnyPerm,
    refresh: refreshPermissions,
  };
}
