import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const initialState = {
  items: [],
  builds: [],
  totalAmount: 0,
  totalItems: 0,
  isLoading: false
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CART':
      return {
        ...state,
        items: action.payload.items || [],
        builds: action.payload.builds || [],
        totalAmount: action.payload.totalAmount || 0,
        totalItems: action.payload.totalItems || 0,
        isLoading: false
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        builds: [],
        totalAmount: 0,
        totalItems: 0
      };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Load cart when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    } else {
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [isAuthenticated]);

  const loadCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.get('/api/cart');
      dispatch({ type: 'SET_CART', payload: response.data.cart });
    } catch (error) {
      console.error('Error loading cart:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await axios.post('/api/cart/items', { productId, quantity });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Item added to cart!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add item to cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  const updateCartItem = async (productId, quantity) => {
    try {
      const response = await axios.put(`/api/cart/items/${productId}`, { quantity });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update cart item';
      toast.error(message);
      return { success: false, message };
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const response = await axios.delete(`/api/cart/items/${productId}`);
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Item removed from cart!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove item from cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  const addBuildToCart = async (buildId) => {
    try {
      const response = await axios.post('/api/cart/builds', { buildId });
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Build added to cart!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add build to cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  const removeBuildFromCart = async (buildId) => {
    try {
      const response = await axios.delete(`/api/cart/builds/${buildId}`);
      dispatch({ type: 'SET_CART', payload: response.data.cart });
      toast.success('Build removed from cart!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove build from cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete('/api/cart');
      dispatch({ type: 'CLEAR_CART' });
      toast.success('Cart cleared!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to clear cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Helper function to calculate cart total
  const getCartTotal = () => {
    return state.totalAmount;
  };

  // Helper function to get cart item count
  const getCartItemCount = () => {
    return state.totalItems;
  };

  // Alias for updateCartItem to match Cart component expectations
  const updateQuantity = async (productId, quantity) => {
    return await updateCartItem(productId, quantity);
  };

  const value = {
    ...state,
    cartItems: state.items, // Alias for compatibility
    addToCart,
    updateCartItem,
    updateQuantity, // Add this alias
    removeFromCart,
    addBuildToCart,
    removeBuildFromCart,
    clearCart,
    loadCart,
    getCartTotal, // Add this function
    getCartItemCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
