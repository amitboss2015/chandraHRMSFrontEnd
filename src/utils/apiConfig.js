// Centralized API configuration - URL-agnostic (works for localhost, ngrok, chandrahr.in)
// Uses hostname so same build works everywhere. VITE_API_BASE_URL overrides when set.

const trimTrailingSlash = (s) => (s || '').replace(/\/+$/, '');

export const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return trimTrailingSlash(import.meta.env.VITE_API_BASE_URL);
  }
  // Use relative /api for all hosts - Vite proxies in dev, nginx in prod, ngrok tunnels to same origin
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api'; // Direct to backend when on same machine
  }
  return '/api'; // ngrok, chandrahr.in, etc. - same-origin, proxied
};

export const API_BASE = getApiBase();
export const DEFAULT_TENANT_ID = 'SASA001';

/** Public backend hint (no JWT). Backend: GET /api/public/client-config */
export async function fetchPublicClientConfig() {
  const base = getApiBase();
  try {
    const r = await fetch(`${base}/public/client-config`);
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}

/** Face-attendance web app URL: VITE_FACE_ATTENDANCE_URL, else backend client-config, else ''. */
export function getFaceAttendanceUrlSync() {
  const v = (import.meta.env?.VITE_FACE_ATTENDANCE_URL || '').trim();
  return v ? trimTrailingSlash(v) : '';
}
