'use client';

import { useCallback, useEffect, useState } from 'react';
import examsApi from './api';
import { ExamsUser, clearSession, cacheUser, getCachedUser, getToken } from './session';

type Status = 'loading' | 'authenticated' | 'anonymous';

// Restores the exams session on load: the cached user shows immediately,
// then /exams/me confirms it against the server.
export default function useExamsUser() {
  const [user, setUser] = useState<ExamsUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }
    const cached = getCachedUser();
    if (cached) setUser(cached);
    let alive = true;
    (async () => {
      try {
        const { data } = await examsApi.get('/exams/me');
        if (!alive) return;
        setUser(data.user);
        cacheUser(data.user);
        setStatus('authenticated');
      } catch {
        if (!alive) return;
        clearSession();
        setUser(null);
        setStatus('anonymous');
      }
    })();
    return () => { alive = false; };
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus('anonymous');
  }, []);

  return { user, status, signOut };
}
