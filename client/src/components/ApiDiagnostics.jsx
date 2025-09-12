import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

export default function ApiDiagnostics() {
  const [tests, setTests] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTests([]);
    
    const results = [];
    
    // Test 1: Environment check
    results.push({
      name: 'Environment Check',
      status: 'info',
      message: `PROD: ${import.meta.env.PROD}, VITE_BACKEND_URL: ${import.meta.env.VITE_BACKEND_URL || 'NOT SET'}`,
      details: `API_BASE_URL resolved to: ${API_BASE_URL || 'EMPTY'}`
    });
    
    // Test 2: Health check
    try {
      const start = Date.now();
      const healthResponse = await axios.get('/api/health', { timeout: 8000 });
      const responseTime = Date.now() - start;
      results.push({
        name: 'Backend Health',
        status: 'success',
        message: `Backend responding in ${responseTime}ms`,
        details: JSON.stringify(healthResponse.data, null, 2)
      });
    } catch (error) {
      results.push({
        name: 'Backend Health',
        status: 'error',
        message: error.code === 'ECONNABORTED' ? 'Timeout (>8s)' : error.message,
        details: `Status: ${error.response?.status || 'No response'}, URL: ${error.config?.url}`
      });
    }
    
    // Test 3: CORS/Auth check
    try {
      const start = Date.now();
      const authResponse = await axios.get('/api/auth/me', { timeout: 8000 });
      const responseTime = Date.now() - start;
      results.push({
        name: 'Auth Endpoint',
        status: authResponse.status === 200 ? 'success' : 'warning',
        message: `Auth check completed in ${responseTime}ms (${authResponse.status})`,
        details: JSON.stringify(authResponse.data, null, 2)
      });
    } catch (error) {
      const isExpected401 = error.response?.status === 401;
      results.push({
        name: 'Auth Endpoint',
        status: isExpected401 ? 'warning' : 'error',
        message: isExpected401 ? '401 - Not logged in (expected if no session)' : 
                error.code === 'ECONNABORTED' ? 'Timeout (>8s)' : error.message,
        details: `Status: ${error.response?.status || 'No response'}, Headers: ${JSON.stringify(error.response?.headers || {})}`
      });
    }
    
    // Test 4: Products endpoint
    try {
      const start = Date.now();
      const productsResponse = await axios.get('/api/products?limit=1', { timeout: 8000 });
      const responseTime = Date.now() - start;
      results.push({
        name: 'Products Endpoint',
        status: 'success',
        message: `Products loaded in ${responseTime}ms`,
        details: `Found ${productsResponse.data.products?.length || 0} products`
      });
    } catch (error) {
      results.push({
        name: 'Products Endpoint',
        status: 'error',
        message: error.code === 'ECONNABORTED' ? 'Timeout (>8s)' : error.message,
        details: `Status: ${error.response?.status || 'No response'}, URL: ${error.config?.url}`
      });
    }
    
    setTests(results);
    setIsRunning(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!showDiagnostics) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000
      }}>
        <button
          onClick={() => setShowDiagnostics(true)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          title="Open API Diagnostics"
        >
          🔧
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>API Diagnostics</h2>
          <button
            onClick={() => setShowDiagnostics(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.7 : 1
            }}
          >
            {isRunning ? '🔄 Running Tests...' : '▶️ Run Diagnostics'}
          </button>
        </div>

        <div>
          {tests.map((test, index) => (
            <div key={index} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              marginBottom: '10px',
              padding: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: getStatusColor(test.status),
                  marginRight: '10px'
                }} />
                <strong>{test.name}</strong>
              </div>
              <div style={{ marginBottom: '8px', color: '#374151' }}>
                {test.message}
              </div>
              {test.details && (
                <details>
                  <summary style={{ cursor: 'pointer', color: '#6b7280' }}>View Details</summary>
                  <pre style={{
                    background: '#f3f4f6',
                    padding: '10px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px',
                    marginTop: '8px'
                  }}>
                    {test.details}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
        
        {tests.length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#f0f9ff',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>Quick Fix Guide:</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              <li>If VITE_BACKEND_URL is "NOT SET" → Set it in Vercel frontend project env vars</li>
              <li>If Backend Health fails → Check backend deployment and CORS_ORIGINS env var</li>
              <li>If Auth/Products timeout → Backend may be sleeping (cold start) or unreachable</li>
              <li>If 401 on auth/me is persistent after login → Session cookies not working (CORS issue)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
