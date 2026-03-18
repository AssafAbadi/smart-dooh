/**
 * Shared API base and headers for backend requests.
 * When using ngrok free tier, non-browser requests must include ngrok-skip-browser-warning
 * or ngrok may return an HTML interstitial and break JSON responses (e.g. on cellular).
 * Value is inlined at bundle build time by Expo (from .env when you run npx expo start).
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const isNgrok = typeof API_BASE === 'string' && API_BASE.includes('ngrok');

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[apiClient] API base inlined at build time:', API_BASE);
}

export function getApiBase(): string {
  return API_BASE;
}

/** Default headers for API requests. Include these so ngrok forwards to the backend on cellular. */
export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(isNgrok ? { 'ngrok-skip-browser-warning': '1' } : {}),
    ...extra,
  };
  return headers;
}

const AUTH_TOKEN_KEY = 'adrive_auth_token';

/** Get stored auth token key name (for SecureStore). */
export function getAuthTokenKey(): string {
  return AUTH_TOKEN_KEY;
}

/** Build headers with optional Bearer token. Caller should pass token from SecureStore when needed. */
export function authHeaders(token: string | null): Record<string, string> {
  const h = apiHeaders();
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}
