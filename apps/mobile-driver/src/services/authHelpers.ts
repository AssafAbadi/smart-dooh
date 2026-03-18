/**
 * Decode JWT payload without verification (client-side only; used to read email/isVerified/driverId for routing and API).
 */
export function decodeJwtPayload(token: string): {
  email?: string;
  isVerified?: boolean;
  driverId?: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as { email?: string; isVerified?: boolean; driverId?: string };
  } catch {
    return null;
  }
}
