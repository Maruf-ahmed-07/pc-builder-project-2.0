import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import API_BASE_URL from './config/api.js';
import axios from 'axios';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { CompareProvider } from './contexts/CompareContext.jsx';
import { ChatProvider } from './contexts/ChatContext.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

if (API_BASE_URL) {
	axios.defaults.baseURL = API_BASE_URL;
	axios.defaults.withCredentials = true;
	console.log('Axios baseURL set to', API_BASE_URL);
}

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
