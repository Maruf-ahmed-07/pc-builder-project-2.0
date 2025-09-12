import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Add axios interceptor to handle auth failures globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // If we get 401 on any authenticated endpoint (except /auth/me which we handle separately)
        if (error.response?.status === 401 && 
            !error.config.url?.includes('/auth/me') && 
            state.isAuthenticated) {
          console.log('Session expired, logging out...');
          sessionStorage.removeItem('user_session');
          dispatch({ type: 'LOGOUT' });
          toast('Session expired. Please log in again.', { icon: '🔒' });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [state.isAuthenticated]);	// (Session based; no token header needed. Remove token logic if previously present.)
  useEffect(() => {
    const loadUser = async () => {
      // Check if we think user should be logged in
      const hadSession = sessionStorage.getItem('user_session') === 'active';
      
      try {
        // Try multiple times with increasing delays for better reliability
        let maxRetries = hadSession ? 3 : 1; // More retries if we expect to be logged in
        let retryDelay = 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await axios.get('/api/auth/me', { 
              timeout: hadSession ? 12000 : 6000 // Longer timeout if expecting session
            });
            
            dispatch({ type: 'SET_USER', payload: response.data.user });
            sessionStorage.setItem('user_session', 'active');
            setIsInitialized(true);
            return;
            
          } catch (error) {
            // If it's a clear 401, user is not logged in - don't retry
            if (error?.response?.status === 401) {
              sessionStorage.removeItem('user_session');
              break;
            }
            
            // If it's the last attempt, give up
            if (attempt === maxRetries) {
              throw error;
            }
            
            // Only retry on network/timeout errors
            if (error.code === 'ECONNABORTED' || !error.response) {
              console.log(`Auth retry ${attempt}/${maxRetries} after ${retryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryDelay *= 1.5; // Exponential backoff
            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        if (error?.response?.status !== 401) {
          console.warn('Auth session restore failed:', {
            status: error?.response?.status,
            code: error?.code,
            hadSession,
            url: error?.config?.url
          });
          
          // If we expected to be logged in but failed, show a subtle message
          if (hadSession) {
            toast('Session expired or connection issue', { 
              icon: '⚠️',
              duration: 3000 
            });
          }
        }
        sessionStorage.removeItem('user_session');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        setIsInitialized(true);
      }
    };
    
    loadUser();
  }, []);  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.post('/api/auth/login', { email, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.data.user } });
      // Store session indicator to help with reload persistence
      sessionStorage.setItem('user_session', 'active');
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
    try { 
      await axios.post('/api/auth/logout'); 
      // Clear any local session indicators
      sessionStorage.removeItem('user_session');
    } catch (error) { 
      console.warn('Logout error', error); 
    }
    dispatch({ type: 'LOGOUT' });
  };	const updateProfile = async (profileData) => {
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

	const value = { ...state, login, register, logout, updateProfile, changePassword, isInitialized };
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within an AuthProvider');
	return context;
};

