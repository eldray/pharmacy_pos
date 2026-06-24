// src/api/api.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { isCacheable, writeCache, readCache } from '../lib/offlineCache';

// Use relative URL → Vite proxy handles localhost:5000
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// ─── Auth token ────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Normalized error message ────────────────────────────────────────────────
// Backend standardized on { success, message }, but some legacy routes still
// use { msg }. Read both, then fall back to a sensible default.
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as AxiosError<any>;
  if (err?.response?.data) {
    const d = err.response.data;
    return d.message || d.msg || d.error || fallback;
  }
  if (err?.code === 'ERR_NETWORK' || (err as any)?.message === 'Network Error') {
    return 'Network error — please check your connection.';
  }
  return (err as any)?.message || fallback;
}

// ─── Retry idempotent GETs on transient failures ─────────────────────────────
const MAX_RETRIES = 2;
const isTransient = (error: AxiosError): boolean => {
  if (error.code === 'ERR_NETWORK') return true;      // no response (server down / offline)
  const status = error.response?.status;
  return status === 429 || (status !== undefined && status >= 500); // rate-limited or 5xx
};

// ─── Response handling: cache good reads; retry + serve-stale on failure ──────
api.interceptors.response.use(
  (response) => {
    // Cache successful GETs for the offline read-cache.
    if (response.config.method === 'get' && response.config.url && isCacheable(response.config.url)) {
      writeCache(response.config.url, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retryCount?: number }) | undefined;

    // 401 → session invalid: clear token and bounce to login.
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const isGet = config?.method === 'get';

    // Retry idempotent GETs with exponential backoff.
    if (config && isGet && isTransient(error)) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= MAX_RETRIES) {
        const delay = 300 * 2 ** (config._retryCount - 1); // 300ms, 600ms
        await new Promise((r) => setTimeout(r, delay));
        return api(config);
      }
    }

    // Last resort for reads: serve stale cache so the UI still works offline.
    if (config && isGet && config.url && isCacheable(config.url)) {
      const cached = readCache(config.url);
      if (cached !== null) {
        return Promise.resolve({
          data: cached,
          status: 200,
          statusText: 'OK (cached)',
          headers: {},
          config,
          fromCache: true,
        } as any);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
