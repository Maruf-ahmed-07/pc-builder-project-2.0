import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import toast from 'react-hot-toast';

// Ensure axios has correct base + credentials for session cookies
axios.defaults.withCredentials = true;
if (API_BASE_URL) axios.defaults.baseURL = API_BASE_URL;

const AuthContext = createContext();

const initialState = {
	user: null,
	isLoading: true,
	isAuthenticated: false
};

const authReducer = (state, action) => {
	switch (action.type) {
		case 'LOGIN_SUCCESS':
			return {
				...state,
				user: action.payload.user,
				isAuthenticated: true,
				isLoading: false
			};
		case 'LOGOUT':
			return {
				...state,
				user: null,
				isAuthenticated: false,
				isLoading: false
			};
		case 'SET_LOADING':
			return {
				...state,
				isLoading: action.payload
			};
		case 'SET_USER':
			return {
				...state,
				user: action.payload,
				isAuthenticated: !!action.payload,
				isLoading: false
			};
		default:
			return state;
	}
};

export const AuthProvider = ({ children }) => {
	const [state, dispatch] = useReducer(authReducer, initialState);

	// (Session based; no token header needed. Remove token logic if previously present.)
	useEffect(() => {
			const loadUser = async () => {
				try {
					const response = await axios.get('/api/auth/me');
					dispatch({ type: 'SET_USER', payload: response.data.user });
				} catch (error) {
					// A 401 here simply means "not logged in" on first load – suppress noisy console
					if (error?.response?.status && error.response.status !== 401) {
						console.warn('Auth load /api/auth/me failed', error.response.status, error.response.data);
					}
					dispatch({ type: 'SET_LOADING', payload: false });
				}
			};
		loadUser();
	}, []);

  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.post('/api/auth/login', { email, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.data.user } });
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      let message = 'Login failed';
      
      if (error.code === 'ECONNABORTED') {
        message = 'Login timeout - backend may be unreachable';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.status === 401) {
        message = 'Invalid email or password';
      } else if (!error.response) {
        message = 'Cannot connect to server';
      }
      
      toast.error(message);
      console.error('Login error:', { 
        status: error.response?.status, 
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL 
      });
      return { success: false, message };
    }
  };	const register = async (userData) => {
		try {
			dispatch({ type: 'SET_LOADING', payload: true });
			const response = await axios.post('/api/auth/register', userData);
			dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.data.user } });
			return { success: true };
		} catch (error) {
			dispatch({ type: 'SET_LOADING', payload: false });
			const message = error.response?.data?.message || 'Registration failed';
			return { success: false, message };
		}
	};

	const logout = async () => {
		try { await axios.post('/api/auth/logout'); } catch (error) { console.warn('Logout error', error); }
		dispatch({ type: 'LOGOUT' });
	};

	const updateProfile = async (profileData) => {
		try {
			const response = await axios.put('/api/auth/profile', profileData);
			dispatch({ type: 'SET_USER', payload: response.data.user });
			toast.success('Profile updated successfully!');
			return { success: true };
		} catch (error) {
			const message = error.response?.data?.message || 'Profile update failed';
			toast.error(message);
			return { success: false, message };
		}
	};

	const changePassword = async (currentPassword, newPassword) => {
		try {
			await axios.put('/api/auth/change-password', { currentPassword, newPassword });
			toast.success('Password changed successfully!');
			return { success: true };
		} catch (error) {
			const message = error.response?.data?.message || 'Password change failed';
			toast.error(message);
			return { success: false, message };
		}
	};

	const value = { ...state, login, register, logout, updateProfile, changePassword };
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within an AuthProvider');
	return context;
};

