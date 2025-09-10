// Central API base URL resolution for frontend (Vite variant)
// Provide VITE_API_BASE for explicit backend origin in production (e.g. https://api.example.com)
let API_BASE_URL = '';

if (import.meta.env.VITE_API_BASE) {
  API_BASE_URL = import.meta.env.VITE_API_BASE.trim().replace(/\/$/, '');
} else if (import.meta.env.DEV) {
  API_BASE_URL = 'http://localhost:5000';
} else {
  API_BASE_URL = '';
}

export default API_BASE_URL;


