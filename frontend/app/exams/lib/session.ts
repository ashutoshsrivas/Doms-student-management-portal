// The exams portal keeps its own session, separate from the DOMS portal:
// its own cookies, its own cached user. Signing out of one does not touch
// the other, and nothing here is shared with the main app.

// Plain document.cookie — no extra libraries, so the portal stands alone.
const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const hit = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};

const writeCookie = (name: string, value: string, days: number) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const dropCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const TOKEN_KEY = 'exams_token';
export const REFRESH_KEY = 'exams_refresh_token';
const USER_KEY = 'exams_user';

export type ExamsUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  approvedRole: string;
  isAdmin: boolean;
};

export const getToken = () => readCookie(TOKEN_KEY);
export const getRefreshToken = () => readCookie(REFRESH_KEY);

export const setAccessToken = (token: string) => {
  writeCookie(TOKEN_KEY, token, 1);
};

export const saveSession = (token: string, refreshToken: string, user: ExamsUser) => {
  setAccessToken(token);
  if (refreshToken) writeCookie(REFRESH_KEY, refreshToken, 7);
  cacheUser(user);
};

export const cacheUser = (user: ExamsUser | null) => {
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch { /* private mode — the session still works, just without the cache */ }
};

export const getCachedUser = (): ExamsUser | null => {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as ExamsUser) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  dropCookie(TOKEN_KEY);
  dropCookie(REFRESH_KEY);
  cacheUser(null);
};
