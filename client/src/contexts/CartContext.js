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

  const addToCart = async (productId, quantity = 1, options = {}) => {
    try {
      const response = await axios.post('/api/cart/items', { productId, quantity });
      if (response.data && response.data.cart) {
        dispatch({ type: 'SET_CART', payload: response.data.cart });
      } else {
        await loadCart();
      }
      // Only show the generic toast when caller does not request silent mode
      if (!options.silent) {
        toast.success('Item added to cart!');
      }
      return { success: true, cart: response.data?.cart };
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

  const addBuildToCart = async (buildId, options = {}) => {
    try {
      const response = await axios.post('/api/cart/builds', { buildId });
      // Server may not return the updated cart or may apply the change asynchronously.
      // Try to read the cart from the server a few times before giving up.
      if (response.data && response.data.cart) {
        dispatch({ type: 'SET_CART', payload: response.data.cart });
        if (!options.silent) toast.success('Build added to cart!');
        return { success: true, cart: response.data.cart };
      }

      // Poll the cart endpoint a few times to catch eventual consistency on some backends
      let attempts = 0;
      let lastCart = null;
      while (attempts < 4) {
        try {
          const cartResp = await axios.get('/api/cart');
          lastCart = cartResp.data?.cart;
          // If cart now includes the build (either in builds list or items), accept it
          const hasBuild = (lastCart?.builds || []).some(b => b._id === buildId) ||
            (lastCart?.items || []).some(i => i.buildId === buildId);
          if (hasBuild) {
            dispatch({ type: 'SET_CART', payload: lastCart });
            if (!options.silent) toast.success('Build added to cart!');
            return { success: true, cart: lastCart };
          }
        } catch (e) {
          // ignore and retry
        }
        attempts++;
        // small delay
        await new Promise(r => setTimeout(r, 400));
      }

      // If we reach here, just load whatever the server returns and continue
      if (lastCart) {
        dispatch({ type: 'SET_CART', payload: lastCart });
      } else {
        await loadCart();
      }
  if (!options.silent) toast.success('Build added to cart!');
  return { success: true, cart: lastCart };
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

  const getCartTotal = () => {
    return state.totalAmount;
  };

  const getCartItemCount = () => {
    return state.totalItems;
  };

  // Alias for components expecting 'updateQuantity' method
  const updateQuantity = async (productId, quantity) => {
    return await updateCartItem(productId, quantity);
  };

  const value = {
    ...state,
    cartItems: state.items,
    addToCart,
    updateCartItem,
    updateQuantity,
    removeFromCart,
    addBuildToCart,
    removeBuildFromCart,
    clearCart,
    loadCart,
    getCartTotal,
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
