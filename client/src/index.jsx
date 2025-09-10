import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { CompareProvider } from './contexts/CompareContext';
import { ChatProvider } from './contexts/ChatContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <CompareProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </CompareProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
