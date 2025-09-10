// Central API base URL resolution for frontend.
// Set REACT_APP_API_URL in your environment (Vercel dashboard) to the deployed backend origin, e.g. https://api.example.com
// If not set, we fall back to relative requests (assuming a reverse proxy / rewrite) or localhost in development.
let API_BASE_URL = '';

if (process.env.REACT_APP_API_URL) {
  API_BASE_URL = process.env.REACT_APP_API_URL.trim().replace(/\/$/, '');
} else if (process.env.NODE_ENV === 'development') {
  API_BASE_URL = 'http://localhost:5000';
} else {
  // production fallback: relative path (works with vercel.json rewrite or same-origin deployment)
  API_BASE_URL = '';
}

export default API_BASE_URL;

