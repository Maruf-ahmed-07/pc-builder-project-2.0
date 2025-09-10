import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import API_BASE_URL from './config/api.js';
import axios from 'axios';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';

if (API_BASE_URL) {
	axios.defaults.baseURL = API_BASE_URL;
	axios.defaults.withCredentials = true;
	console.log('Axios baseURL set to', API_BASE_URL);
}

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<AuthProvider>
			<CartProvider>
				<App />
			</CartProvider>
		</AuthProvider>
	</React.StrictMode>
);
