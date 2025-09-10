// API base URL resolution.
// In Vite, env vars exposed to client must be prefixed with VITE_.
// Set VITE_BACKEND_URL in your Vercel frontend project (e.g. https://your-backend.vercel.app)
// Do NOT include a trailing slash.
const explicit = import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL.trim();

// Fallback logic: if production and no explicit var, keep previous localhost (not ideal) so it's obvious.
const API_BASE_URL = explicit || (import.meta.env.PROD ? 'http://localhost:5000' : '');

if (import.meta.env.PROD && !explicit) {
  // Helpful diagnostic so production console shows misconfiguration clearly
  console.warn('[API] VITE_BACKEND_URL missing – falling back to http://localhost:5000 (this will fail in production). Set VITE_BACKEND_URL in your frontend project env vars.');
}

// Helper to build full API path whether caller passes already absolute or just /api/... path.
export function apiUrl(path = '') {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  if (path.startsWith('/')) return API_BASE_URL + path; // normal case '/api/...'
  return API_BASE_URL + '/' + path;
}

export default API_BASE_URL;
