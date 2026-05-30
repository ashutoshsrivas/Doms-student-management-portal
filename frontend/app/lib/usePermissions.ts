'use client';

// Fetches the logged-in user's effective permissions from
// /api/auth/me/permissions and caches them in module-local state.
// Consumers get a synchronous `hasPerm(key)` helper that's
// fast / reactive across the whole app.
//
// IMPORTANT: cache is keyed by user.id. When the active user changes
// (login, logout, account switch), the cache is invalidated immediately
// so we never serve a previous user's permissions to the next user.

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/app/lib/apiClient';
import useAuthStore from '@/app/store/authStore';

interface PermissionsState {
  loaded: boolean;
  forUserId: string | null;  // which user the current cache belongs to
  perms: Set<string>;
  lastFetchedAt: number;
  inFlight: Promise<void> | null;
}

const STATE: PermissionsState = {
  loaded: false,
  forUserId: null,
  perms: new Set(),
  lastFetchedAt: 0,
  inFlight: null,
};
const STALE_MS = 60_000;
const listeners = new Set<() => void>();

function notify() { for (const l of listeners) l(); }

/** Wipe everything — call on logout. */
export function clearPermissionsCache(): void {
  STATE.loaded = false;
  STATE.forUserId = null;
  STATE.perms = new Set();
  STATE.lastFetchedAt = 0;
  STATE.inFlight = null;
  notify();
}

async function fetchPermissionsFor(userId: string): Promise<void> {
  if (STATE.inFlight) return STATE.inFlight;
  STATE.inFlight = (async () => {
    try {
      const res = await apiClient.get('/auth/me/permissions');
      STATE.perms = new Set<string>(res.data?.permissions || []);
      STATE.loaded = true;
      STATE.forUserId = userId;
      STATE.lastFetchedAt = Date.now();
      notify();
    } catch (e) {
      // If the request fails, clear the loaded flag so guards stop
      // trusting whatever stale value might be sitting around.
      STATE.loaded = false;
      STATE.forUserId = null;
      STATE.perms = new Set();
      notify();
      console.warn('[usePermissions] fetch failed', e);
    } finally {
      STATE.inFlight = null;
    }
  })();
  return STATE.inFlight;
}

/** Force-refetch the active user's perms on next call. */
export function refreshPermissions(): void {
  STATE.lastFetchedAt = 0;
  STATE.loaded = false;
  // forUserId stays set so a concurrent fetch knows who it belongs to
  if (STATE.forUserId) fetchPermissionsFor(STATE.forUserId);
}

/**
 * Hook used by sidebar items and page guards. Returns:
 *   - loaded: false until the active user's perms are fetched
 *   - hasPerm(key): synchronous check against the cached set, ONLY
 *     trusted when (loaded && forUserId === current user id)
 *   - perms: the raw Set (useful for debugging / dev tools)
 */
export default function usePermissions() {
  const { user } = useAuthStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);

  useEffect(() => {
    // No user → blank cache
    if (!user?.id) {
      if (STATE.loaded || STATE.forUserId) clearPermissionsCache();
      return;
    }
    // Different user than cached → blank cache and fetch
    if (STATE.forUserId !== user.id) {
      STATE.loaded = false;
      STATE.forUserId = user.id;
      STATE.perms = new Set();
      STATE.lastFetchedAt = 0;
      fetchPermissionsFor(user.id);
      notify();
      return;
    }
    // Same user, stale → refetch
    const stale = Date.now() - STATE.lastFetchedAt > STALE_MS;
    if (!STATE.loaded || stale) fetchPermissionsFor(user.id);
  }, [user?.id]);

  // hasPerm only returns true when the cache is loaded AND belongs to the
  // currently signed-in user. Avoids ever serving another user's perms.
  const hasPerm = useCallback((key: string): boolean => {
    if (!STATE.loaded) return false;
    if (!user?.id || STATE.forUserId !== user.id) return false;
    return STATE.perms.has(key);
  }, [user?.id]);

  const hasAnyPerm = useCallback((...keys: string[]): boolean => {
    if (!STATE.loaded) return false;
    if (!user?.id || STATE.forUserId !== user.id) return false;
    return keys.some((k) => STATE.perms.has(k));
  }, [user?.id]);

  const loaded = STATE.loaded && STATE.forUserId === user?.id;

  return {
    loaded,
    perms: STATE.perms,
    hasPerm,
    hasAnyPerm,
    refresh: refreshPermissions,
  };
}
