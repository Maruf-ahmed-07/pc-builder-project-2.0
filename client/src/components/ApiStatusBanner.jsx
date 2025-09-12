import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

// Simple diagnostic banner to surface backend connectivity issues in production.
export default function ApiStatusBanner() {
  const [status, setStatus] = useState({ ok: true, msg: '', loading: true, responseTime: null });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const startTime = Date.now();
      try {
        const res = await axios.get('/api/health', { timeout: 6000 });
        const responseTime = Date.now() - startTime;
        if (cancelled) return;
        if (!res.data?.status) {
          setStatus({ ok: false, msg: 'Health endpoint returned unexpected response', loading: false, responseTime });
        } else {
          setStatus({ ok: true, msg: '', loading: false, responseTime });
        }
      } catch (e) {
        const responseTime = Date.now() - startTime;
        if (cancelled) return;
        const msg = e.code === 'ECONNABORTED' ? 'Timeout (>6s)' : 
                   e.response?.status ? `HTTP ${e.response.status}` : 'Network error';
        setStatus({ ok: false, msg, loading: false, responseTime });
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const missingEnv = import.meta.env.PROD && !import.meta.env.VITE_BACKEND_URL;
  if (!missingEnv && status.ok && !status.loading) return null;

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
        {status.loading && '🔄 Checking backend connection...'}
        {missingEnv && !status.loading && 'VITE_BACKEND_URL not set – API calls are pointing to http://localhost:5000 (will fail on Vercel).'}
        {!missingEnv && !status.ok && !status.loading && `Backend unreachable at ${API_BASE_URL || '(unset)'}: ${status.msg}`}
        {status.responseTime && status.responseTime > 3000 && !status.loading && ` (slow: ${status.responseTime}ms)`}
      </span>
      <div style={{fontSize: '11px', opacity: 0.8}}>
        {API_BASE_URL && <code>API_BASE_URL={API_BASE_URL}</code>}
        {status.responseTime && status.ok && <span style={{marginLeft: '8px'}}>⚡ {status.responseTime}ms</span>}
      </div>
    </div>
  );
}
