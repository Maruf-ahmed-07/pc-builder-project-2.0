import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

// Simple diagnostic banner to surface backend connectivity issues in production.
export default function ApiStatusBanner() {
  const [status, setStatus] = useState({ ok: true, msg: '' });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await axios.get('/api/health', { timeout: 6000 });
        if (cancelled) return;
        if (!res.data?.status) {
          setStatus({ ok: false, msg: 'Health endpoint returned unexpected response' });
        } else {
          setStatus({ ok: true, msg: '' });
        }
      } catch (e) {
        if (cancelled) return;
        setStatus({ ok: false, msg: e.response?.status ? `HTTP ${e.response.status}` : 'Network error' });
      }
    };
    check();
  }, []);

  const missingEnv = import.meta.env.PROD && !import.meta.env.VITE_BACKEND_URL;
  if (!missingEnv && status.ok) return null;

  return (
    <div style={{
      background: missingEnv ? '#8b0000' : '#b45309',
      color: 'white',
      padding: '6px 12px',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 9999
    }}>
      <span>
        {missingEnv && 'VITE_BACKEND_URL not set – API calls are pointing to http://localhost:5000 (will fail on Vercel).'}
        {!missingEnv && !status.ok && `Backend unreachable at ${API_BASE_URL || '(unset)'}: ${status.msg}`}
      </span>
      {API_BASE_URL && <code style={{opacity:0.8}}>API_BASE_URL={API_BASE_URL}</code>}
    </div>
  );
}
