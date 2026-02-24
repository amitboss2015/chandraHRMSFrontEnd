// Centralized API configuration - URL-agnostic (works for localhost, ngrok, chandrahr.in)
// Uses hostname so same build works everywhere. VITE_API_BASE_URL overrides when set.

const trimTrailingSlash = (s) => (s || '').replace(/\/+$/, '');

export const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return trimTrailingSlash(import.meta.env.VITE_API_BASE_URL);
  }
  // Use relative /api so same build works everywhere: Vite proxies in dev (HTTP or HTTPS), nginx in prod
  return '/api';
};

export const API_BASE = getApiBase();
export const DEFAULT_TENANT_ID = 'SASA001';
