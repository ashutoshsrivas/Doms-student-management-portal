// The portal's own API client. It carries the exams session token, refreshes
// it against /api/exams/refresh and sends people to the portal's own login
// screen — never to the DOMS login.
import axios from 'axios';
import { clearSession, getRefreshToken, getToken, setAccessToken } from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/';

const examsApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

examsApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // baseURL may already carry the /api path segment — keep it.
  if (typeof config.url === 'string' && config.url.startsWith('/')) {
    config.url = config.url.substring(1);
  }
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

examsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('exams/login') || original?.url?.includes('exams/refresh');

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No session');
        const { data } = await axios.post(`${API_URL.replace(/\/$/, '')}/exams/refresh`, { refreshToken });
        setAccessToken(data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return examsApi(original);
      } catch (refreshError) {
        clearSession();
        if (typeof window !== 'undefined') window.location.href = '/exams/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default examsApi;
