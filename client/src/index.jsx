import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import API_BASE_URL from './config/api.js';
import axios from 'axios';
import { AuthProvider } from './contexts/AuthContext.jsx';
// Optional: add other providers when their content restored (Compare, Cart, Chat)

if (API_BASE_URL) {
	axios.defaults.baseURL = API_BASE_URL;
	axios.defaults.withCredentials = true;
	console.log('Axios baseURL set to', API_BASE_URL);
}

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<AuthProvider>
			<App />
		</AuthProvider>
	</React.StrictMode>
);
